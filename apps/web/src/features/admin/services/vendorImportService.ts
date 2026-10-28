import { addDays, isValid, parseISO, startOfDay, subDays } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { uniqueVendorId } from '../../vendor-profile/utils/draftVendor';
import { formatLocalPhone, normalizeNigerianPhone } from '../../../utils/phone';
import { BUNDLE_RULES } from '../../vendor-dashboard/bundles';
import { ASSOCIATION_MEMBER_STATUS } from '../../vendor-dashboard/constants';
import {
  addVendorMemberNow,
  allAssociations,
  countedMembers,
  createAssociationNow,
  findAssociation,
  removeMemberNow,
  vendorContactsSnapshot } from
'../../vendor-dashboard/services/associationService';
import { claimNow, claimPath, createInviteNow, inviteById, invitesSnapshot, resendInviteNow, revokeInviteNow } from '../../profile-claim/services/claimService';
import { ADMIN_PERMISSION } from '../config/roles';
import { IMPORT_TIER_OPTIONS, MOCK_IMPORT, VENDOR_IMPORT, type InviteMethod } from '../config/bulkImport';
import { AUDIT_ACTION } from '../constants';
import { SEED_IMPORT } from '../mock/vendorImports';
import { staffById } from '../mock/staff';
import { requirePermission } from './adminSession';
import { recordAudit } from './auditService';
import type { AdminUser } from '../types';
import type { InviteChannel } from '../../profile-claim/types';
import type {
  ImportLookup,
  ImportPartner,
  ImportRowOutcome,
  ImportRowRequest,
  NewPartnerInput,
  VendorImportDetail,
  VendorImportRecord,
  VendorImportRowRecord,
  VendorImportSettings } from
'../bulk/types';

/*
 * Bulk vendor import for trade-association partners (our backend, mocked). The browser reads and checks
 * the file; this receives the checked rows in small batches and, row by row: creates a draft profile with a
 * claim invitation, or links an existing vendor, and adds them to the partner's bundle as members awaiting
 * the prorated payment. A row that fails doesn't stop the others.
 *
 * Data protection: the uploaded file never reaches here. The history keeps only each row's name, business,
 * phone, email and outcome; the rest of the details live on the draft profile the vendor claims.
 */
let imports: VendorImportRecord[] = [];
let nextImportId = 1;
let seeded = false;

const EMPTY_COUNTS: Record<ImportRowOutcome, number> = { created: 0, linked: 0, skipped: 0, failed: 0 };
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong.';

function slugify(name: string): string {
  return uniqueVendorId(name, new Set([...getAllVendors().map((v) => v.id), ...invitesSnapshot().map((i) => i.vendorId)]));
}

const saveImport = (updated: VendorImportRecord) => {
  imports = imports.map((r) => r.id === updated.id ? updated : r);
  return updated;
};

function findImport(id: string): VendorImportRecord {
  ensureSeed();
  const r = imports.find((x) => x.id === id);
  if (!r) throw new ApiError('We couldn’t find that import.', 404);
  return r;
}

function partnerOf(a: ReturnType<typeof findAssociation>): ImportPartner {
  return { id: a.id, name: a.name, adminName: a.adminName, phone: a.contactPhone ?? null, email: a.contactEmail ?? null, terms: a.terms ?? null, memberCount: countedMembers(a).length };
}

/* ---------- Partners ---------- */

/** GET /admin/bulk/partners — trade associations an import can be for. */
export function listImportPartners(): Promise<ImportPartner[]> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.BulkImport);
    ensureSeed();
    return allAssociations().map(partnerOf);
  });
}

function createPartnerNow(admin: AdminUser, input: NewPartnerInput, now: Date): ImportPartner {
  const phone = normalizeNigerianPhone(input.phone);
  if (input.name.trim().length < 3) throw new ApiError('Enter the association’s name.', 400);
  if (input.adminName.trim().length < 2) throw new ApiError('Enter the contact person’s name.', 400);
  if (!phone) throw new ApiError('Enter the contact person’s Nigerian mobile number, e.g. 0803 123 4567.', 400);
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) throw new ApiError('That email address doesn’t look right.', 400);
  if (input.terms.trim().length < 10) throw new ApiError('Describe the bundle terms you agreed (plan, discount, how they pay).', 400);
  const a = createAssociationNow({ ...input, phone }, now);
  recordAudit(admin, AUDIT_ACTION.BulkPartnerCreate, { type: 'association', id: a.id, label: a.name }, { details: `Contact: ${a.adminName}` });
  return partnerOf(a);
}

/** POST /admin/bulk/partners — a new partner association (name, contact, agreed bundle terms). */
export function createImportPartner(input: NewPartnerInput): Promise<ImportPartner> {
  return mockResponse(() => createPartnerNow(requirePermission(ADMIN_PERMISSION.BulkImport), input, new Date()), 500);
}

/* ---------- Checking against existing vendors ---------- */

/**
 * GET /admin/bulk/lookup?partner= — existing vendors and unclaimed invitations by phone and email, so the
 * browser can flag duplicates. (A real backend would take hashed contacts and answer per row.)
 */
export function getImportLookup(partnerId: string): Promise<ImportLookup> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.BulkImport);
    ensureSeed();
    const a = findAssociation(partnerId);
    const members = new Set(a.members.filter((m) => m.status !== ASSOCIATION_MEMBER_STATUS.Removed).map((m) => m.vendorId));
    const lookup: ImportLookup = { phones: {}, emails: {} };
    for (const c of vendorContactsSnapshot()) {
      const entry = { vendorId: c.vendorId, vendorName: c.vendorName, kind: 'vendor' as const, alreadyMember: members.has(c.vendorId) };
      if (c.phone) lookup.phones[c.phone] = entry;
      if (c.email) lookup.emails[c.email.toLowerCase()] = entry;
    }
    for (const i of invitesSnapshot()) {
      if (i.status !== 'invited') continue;
      const entry = { vendorId: i.vendorId, vendorName: i.profile.businessName, kind: 'invited' as const, alreadyMember: members.has(i.vendorId) };
      lookup.phones[i.profile.phone] = entry;
      if (i.profile.email) lookup.emails[i.profile.email] = entry;
    }
    return lookup;
  }, 300);
}

/* ---------- Running an import ---------- */

export interface StartImportInput {
  partnerId: string;
  fileName: string;
  settings: VendorImportSettings;
  /** The admin ticked "the partner has its members' consent". */
  consent: boolean;
  rowCount: number;
}

function startNow(admin: AdminUser, input: StartImportInput, now: Date): VendorImportRecord {
  if (!input.consent) throw new ApiError('Confirm the partner has its members’ consent to share their details.', 400);
  const a = findAssociation(input.partnerId);
  const start = parseISO(input.settings.startDate);
  if (!isValid(start) || start < startOfDay(subDays(now, 1))) throw new ApiError('Choose a start date from today onwards.', 400);
  if (input.settings.planId !== BUNDLE_RULES.memberPlanId) throw new ApiError('Bundle members get the bundle’s plan.', 400);
  if (!IMPORT_TIER_OPTIONS.find((t) => t.id === input.settings.tier)?.available) throw new ApiError('That verification option isn’t available yet.', 400);
  if (input.rowCount < 1 || input.rowCount > VENDOR_IMPORT.maxRows) throw new ApiError(`Import between 1 and ${VENDOR_IMPORT.maxRows} rows.`, 400);
  const record: VendorImportRecord = {
    id: `imp-${nextImportId++}`,
    createdAt: now.toISOString(),
    finishedAt: null,
    partner: { id: a.id, name: a.name },
    by: { id: admin.id, name: admin.name },
    fileName: input.fileName,
    settings: input.settings,
    status: 'running',
    counts: { ...EMPTY_COUNTS },
    rows: [],
    undo: null
  };
  imports = [record, ...imports];
  return record;
}

/** POST /admin/bulk/imports — opens an import (nothing is created yet). */
export function startVendorImport(input: StartImportInput): Promise<{id: string;}> {
  return mockResponse(() => ({ id: startNow(requirePermission(ADMIN_PERMISSION.BulkImport), input, new Date()).id }), 400);
}

const inviteChannel = (m: InviteMethod): InviteChannel | null => m === 'none' ? null : m;

/** One row. Throws for a failed row; the caller records it and carries on. */
function importRow(record: VendorImportRecord, admin: AdminUser, row: ImportRowRequest, origin: string, now: Date): VendorImportRowRecord {
  const base = { line: row.line, fullName: row.profile.fullName, businessName: row.profile.businessName, phone: row.profile.phone, email: row.profile.email ?? null };
  if (row.action === 'skip') return { ...base, outcome: 'skipped', reason: row.reason, vendorId: null, inviteId: null };

  const a = findAssociation(record.partner.id);
  if (row.action === 'link') {
    const already = a.members.some((m) => m.vendorId === row.vendorId && m.status !== ASSOCIATION_MEMBER_STATUS.Removed);
    if (already) return { ...base, outcome: 'skipped', reason: `${row.vendorName} is already a member.`, vendorId: row.vendorId, inviteId: null };
    addVendorMemberNow(a.id, { vendorId: row.vendorId, vendorName: row.vendorName, contact: row.contact }, now);
    return { ...base, outcome: 'linked', reason: null, vendorId: row.vendorId, inviteId: null };
  }

  // Checked again here: the browser's view may be out of date.
  const p = row.profile;
  if (normalizeNigerianPhone(p.phone) !== p.phone) throw new ApiError('Phone number isn’t in the expected format.', 400);
  if (vendorContactsSnapshot().some((c) => c.phone === p.phone) || invitesSnapshot().some((i) => i.status === 'invited' && i.profile.phone === p.phone)) {
    throw new ApiError('A vendor with this phone number was added since the file was checked.', 409);
  }
  if (p.phone.endsWith(MOCK_IMPORT.failingPhoneSuffix)) throw new ApiError('The server couldn’t create this profile (mock failure). Try this row again later.', 500);
  if (countedMembers(a).length >= BUNDLE_RULES.maxMembers) throw new ApiError(`The bundle is full (${BUNDLE_RULES.maxMembers} members).`, 409);

  const vendorId = slugify(p.businessName);
  const invite = createInviteNow(
    {
      vendorId,
      profile: p,
      importId: record.id,
      associationId: a.id,
      associationName: a.name,
      startsOn: record.settings.startDate,
      channel: inviteChannel(record.settings.invite),
      by: admin.name,
      origin,
      validDays: VENDOR_IMPORT.inviteValidDays
    },
    now
  );
  try {
    addVendorMemberNow(a.id, { vendorId, vendorName: p.businessName, contact: formatLocalPhone(p.phone) }, now);
  } catch (e) {
    revokeInviteNow(invite.id, now);
    throw e;
  }
  return { ...base, outcome: 'created', reason: null, vendorId, inviteId: invite.id };
}

function batchNow(admin: AdminUser, importId: string, rows: ImportRowRequest[], origin: string, now: Date): VendorImportRowRecord[] {
  const record = findImport(importId);
  if (record.status !== 'running') throw new ApiError('This import has finished.', 409);
  if (rows.length > VENDOR_IMPORT.batchSize) throw new ApiError(`Send at most ${VENDOR_IMPORT.batchSize} rows at a time.`, 400);
  const results = rows.map((row): VendorImportRowRecord => {
    try {
      return importRow(record, admin, row, origin, now);
    } catch (e) {
      return { line: row.line, fullName: row.profile.fullName, businessName: row.profile.businessName, phone: row.profile.phone, email: row.profile.email ?? null, outcome: 'failed', reason: errorText(e), vendorId: null, inviteId: null };
    }
  });
  const counts = { ...record.counts };
  results.forEach((r) => counts[r.outcome] += 1);
  saveImport({ ...record, rows: [...record.rows, ...results], counts });
  return results;
}

/** POST /admin/bulk/imports/:id/rows — one batch. Each row succeeds or fails on its own. */
export function importVendorBatch(importId: string, rows: ImportRowRequest[], origin: string): Promise<VendorImportRowRecord[]> {
  return mockResponse(() => batchNow(requirePermission(ADMIN_PERMISSION.BulkImport), importId, rows, origin, new Date()), 450);
}

function finishNow(admin: AdminUser, importId: string, now: Date): VendorImportRecord {
  const record = findImport(importId);
  if (record.status !== 'running') return record;
  const c = record.counts;
  const done = saveImport({ ...record, status: c.failed ? 'completed_with_errors' : 'completed', finishedAt: now.toISOString() });
  recordAudit(admin, AUDIT_ACTION.BulkVendorImport, { type: 'vendor_import', id: done.id, label: `${done.partner.name} · ${done.fileName}` }, {
    details: `Created ${c.created}, linked ${c.linked}, skipped ${c.skipped}, failed ${c.failed}. Invitations: ${done.settings.invite}. Starts ${done.settings.startDate}.`
  });
  return done;
}

/** POST /admin/bulk/imports/:id/finish — closes the import and writes it to the audit log. */
export function finishVendorImport(importId: string): Promise<VendorImportRecord> {
  return mockResponse(() => finishNow(requirePermission(ADMIN_PERMISSION.BulkImport), importId, new Date()), 300);
}

/* ---------- History ---------- */

/** GET /admin/bulk/imports — newest first. */
export function listVendorImports(): Promise<VendorImportRecord[]> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.BulkImport);
    ensureSeed();
    return [...imports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

/** GET /admin/bulk/imports/:id — its rows, with who has and hasn't claimed. */
export function getVendorImport(importId: string): Promise<VendorImportDetail> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.BulkImport);
    const record = findImport(importId);
    const rows = record.rows.map((r) => {
      const invite = r.inviteId ? inviteById(r.inviteId) : null;
      return {
        ...r,
        invite: invite ?
        { status: invite.status, link: claimPath(invite.token), lastSentAt: invite.messages.at(-1)?.at ?? null, sends: invite.messages.length, claimedAt: invite.claimedAt } :
        null
      };
    });
    return {
      record,
      rows,
      claimed: rows.filter((r) => r.invite?.status === 'claimed').length,
      unclaimed: rows.filter((r) => r.invite?.status === 'invited').length
    };
  });
}

/** POST /admin/bulk/imports/:id/invites/:inviteId/resend — the claim link again, by SMS or email. */
export function resendImportInvite(importId: string, inviteId: string, channel: InviteChannel, origin: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.BulkImport);
    const record = findImport(importId);
    const invite = inviteById(inviteId);
    if (!invite || invite.importId !== record.id) throw new ApiError('That invitation isn’t part of this import.', 404);
    const message = resendInviteNow(inviteId, channel, admin.name, origin, VENDOR_IMPORT.inviteValidDays, new Date());
    recordAudit(admin, AUDIT_ACTION.BulkInviteResend, { type: 'vendor_import', id: record.id, label: `${invite.profile.businessName} (${record.partner.name})` }, { details: `By ${message.channel} to ${message.to}` });
  }, 400);
}

/**
 * POST /admin/bulk/imports/:id/undo { reason } — withdraws every profile from this import that hasn't
 * been claimed: the link stops working, and they come off the bundle (they were never paid for, so
 * there's nothing to refund). Claimed profiles and linked existing vendors stay.
 */
export function undoVendorImport(importId: string, reason: string): Promise<VendorImportRecord> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.BulkImport);
    const why = reason.trim();
    if (why.length < 5) throw new ApiError('Give a reason for undoing the import.', 400);
    const record = findImport(importId);
    if (record.status === 'running') throw new ApiError('Wait for the import to finish first.', 409);
    const now = new Date();
    const undoable = record.rows.filter((r) => r.inviteId && inviteById(r.inviteId)?.status === 'invited');
    if (undoable.length === 0) throw new ApiError('Nothing left to undo: every profile from this import has been claimed or withdrawn.', 409);
    const a = findAssociation(record.partner.id);
    for (const r of undoable) {
      revokeInviteNow(r.inviteId as string, now);
      const member = a.members.find((m) => m.vendorId === r.vendorId && m.status === ASSOCIATION_MEMBER_STATUS.PendingPayment);
      if (member) removeMemberNow(a.id, member.id, now);
    }
    const created = record.rows.filter((r) => r.outcome === 'created').length;
    const stillLive = record.rows.filter((r) => r.inviteId && inviteById(r.inviteId)?.status === 'claimed').length;
    const removed = (record.undo?.removed ?? 0) + undoable.length;
    const updated = saveImport({ ...record, status: stillLive || created > removed || record.counts.linked ? 'partly_undone' : 'undone', undo: { at: now.toISOString(), by: admin.name, reason: why, removed } });
    recordAudit(admin, AUDIT_ACTION.BulkImportUndo, { type: 'vendor_import', id: record.id, label: `${record.partner.name} · ${record.fileName}` }, { reason: why, details: `Withdrew ${undoable.length} unclaimed ${undoable.length === 1 ? 'profile' : 'profiles'}` });
    return updated;
  }, 600);
}

/* ---------- MOCK history, replayed through the code above ---------- */

function ensureSeed() {
  if (seeded) return;
  seeded = true;
  const admin = staffById(SEED_IMPORT.adminId);
  if (!admin) return;
  const at = subDays(new Date(), SEED_IMPORT.daysAgo);
  const partner = createPartnerNow(admin, SEED_IMPORT.partner, at);
  const record = startNow(admin, {
    partnerId: partner.id,
    fileName: SEED_IMPORT.fileName,
    consent: true,
    rowCount: SEED_IMPORT.rows.length,
    settings: { planId: BUNDLE_RULES.memberPlanId, startDate: at.toISOString().slice(0, 10), tier: 'unverified', invite: SEED_IMPORT.invite }
  }, at);
  const requests: ImportRowRequest[] = SEED_IMPORT.rows.map((r): ImportRowRequest => r.skip !== undefined ? { line: r.line, action: 'skip', reason: r.skip, profile: r.profile } : { line: r.line, action: 'create', profile: r.profile });
  for (let i = 0; i < requests.length; i += VENDOR_IMPORT.batchSize) batchNow(admin, record.id, requests.slice(i, i + VENDOR_IMPORT.batchSize), '', at);
  finishNow(admin, record.id, at);
  for (const line of SEED_IMPORT.claimedLines) {
    const row = findImport(record.id).rows.find((r) => r.line === line);
    const invite = row?.inviteId ? inviteById(row.inviteId) : null;
    if (invite) claimNow(invite.token, { acceptedTerms: true, profile: { businessName: invite.profile.businessName, bio: invite.profile.bio, town: invite.profile.town, yearsExperience: invite.profile.yearsExperience } }, addDays(at, 2));
  }
}
