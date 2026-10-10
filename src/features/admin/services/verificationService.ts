import { addMinutes } from 'date-fns';
import { findVerificationTier } from '../../../data/verificationTiers';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors, setVendorVerification } from '../../../services/vendorStore';
import { JOB_ACTOR } from '../../jobs/constants';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import type { TFunction } from 'i18next';
import { ADMIN_PERMISSION, roleCan } from '../config/roles';
import { ADMIN_POLICIES } from '../config/policies';
import { AUDIT_ACTION, DOCUMENT_PLACEHOLDERS, DOCUMENT_TYPE_LABELS, VENDOR_STANDING_ROUTE, VERIFICATION_STATUS } from '../constants';
import { mockApplications } from '../mock/verification';
import { activeClaim, maskIdNumber } from '../utils/format';
import { requirePermission } from './adminSession';
import { recordAudit } from './auditService';
import type { Verification } from '../../../types/marketplace';
import type { AdminUser, DocumentChecks, DocumentType, VerificationApplication } from '../types';

/*
 * Vendor verification (our backend, mocked). Admins claim an application before reviewing it, so two
 * people never work on the same one; decisions need the claim. Approving writes the tier to the vendor
 * store, so the badge changes everywhere (cards, profile, search filter). Every action is audited, and
 * rejection or a request for more information notifies the vendor, who can resubmit from their dashboard.
 * ID numbers never leave this service unmasked, except through a deliberate, logged reveal.
 */
let applications: VerificationApplication[] = structuredClone(mockApplications);
let nextId = 1100;
let nextDoc = 500;

/** What the browser gets: ID numbers masked; expired claims dropped (and In review goes back to Pending). */
function toClient(app: VerificationApplication, now = new Date()): VerificationApplication {
  const claim = activeClaim(app.claim, now);
  return {
    ...app,
    claim,
    status: app.status === VERIFICATION_STATUS.InReview && !claim ? VERIFICATION_STATUS.Pending : app.status,
    documents: app.documents.map((d) => ({ ...d, idNumber: d.idNumber ? maskIdNumber(d.idNumber) : null }))
  };
}

function find(id: string): VerificationApplication {
  const app = applications.find((a) => a.id === id);
  if (!app) throw new ApiError('We couldn’t find that application.', 404);
  return app;
}

function save(updated: VerificationApplication): VerificationApplication {
  applications = applications.map((a) => a.id === updated.id ? updated : a);
  return updated;
}

const target = (app: VerificationApplication) => ({ type: 'vendor_verification' as const, id: app.id, label: app.vendorName });
const tierLabel = (tier: Verification) => findVerificationTier(tier)?.label ?? tier;
const OPEN: readonly VerificationApplication['status'][] = [VERIFICATION_STATUS.Pending, VERIFICATION_STATUS.InReview];

/** Decisions and saving need your own live claim. */
function requireOwnClaim(app: VerificationApplication, admin: AdminUser): void {
  if (!OPEN.includes(app.status)) throw new ApiError('This application has already been decided.', 409);
  const claim = activeClaim(app.claim);
  if (!claim) throw new ApiError('Claim this application before reviewing it.', 409);
  if (claim.adminId !== admin.id) throw new ApiError(`${claim.adminName} is reviewing this application.`, 409);
}

/* ---------- Admin: queue and review ---------- */

/** GET /admin/verifications — every application, ID numbers masked. */
export function listApplications(): Promise<VerificationApplication[]> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.VerificationReview);
    return applications.map((a) => toClient(a));
  });
}

/** GET /admin/verifications/:id */
export function getApplication(id: string): Promise<VerificationApplication> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.VerificationReview);
    return toClient(find(id));
  }, 300);
}

/** POST /admin/verifications/:id/claim — lock it for 30 minutes. A super admin can take over someone else's claim. */
export function claimApplication(id: string, { takeOver = false }: {takeOver?: boolean;} = {}): Promise<VerificationApplication> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VerificationReview);
    const app = find(id);
    if (!OPEN.includes(app.status)) throw new ApiError('This application has already been decided.', 409);
    const current = activeClaim(app.claim);
    if (current && current.adminId !== admin.id) {
      if (!takeOver) throw new ApiError(`${current.adminName} is reviewing this application.`, 409);
      if (!roleCan(admin.role, ADMIN_PERMISSION.OverrideClaim)) throw new ApiError('Only a super admin can take over a claimed application.', 403);
    }
    const now = new Date();
    recordAudit(admin, AUDIT_ACTION.VerificationClaim, target(app), { details: current && current.adminId !== admin.id ? `Took over from ${current.adminName}` : null });
    return toClient(save({ ...app, status: VERIFICATION_STATUS.InReview, claim: { adminId: admin.id, adminName: admin.name, at: now.toISOString(), expiresAt: addMinutes(now, ADMIN_POLICIES.claimMinutes).toISOString() } }));
  }, 300);
}

/** DELETE /admin/verifications/:id/claim — back to the queue without a decision. */
export function releaseApplication(id: string): Promise<VerificationApplication> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VerificationReview);
    const app = find(id);
    requireOwnClaim(app, admin);
    recordAudit(admin, AUDIT_ACTION.VerificationRelease, target(app));
    return toClient(save({ ...app, status: VERIFICATION_STATUS.Pending, claim: null }));
  }, 300);
}

/** PUT /admin/verifications/:id/review — the checklist and notes (saved as you go). */
export function saveReview(id: string, input: {checks: Record<string, DocumentChecks>;notes: string;}): Promise<VerificationApplication> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VerificationReview);
    const app = find(id);
    requireOwnClaim(app, admin);
    const known = new Set(app.documents.map((d) => d.id));
    const checks = Object.fromEntries(Object.entries(input.checks).filter(([docId]) => known.has(docId)));
    return toClient(save({ ...app, checks, notes: input.notes.slice(0, 2000) }));
  }, 250);
}

/** POST /admin/verifications/:id/reveal — the full ID number on one document. Logged. */
export function revealIdNumber(id: string, documentId: string): Promise<string> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.RevealIdNumber);
    const app = find(id);
    const doc = app.documents.find((d) => d.id === documentId);
    if (!doc?.idNumber) throw new ApiError('This document has no ID number.', 404);
    recordAudit(admin, AUDIT_ACTION.VerificationRevealId, target(app), { details: DOCUMENT_TYPE_LABELS[doc.type] });
    return doc.idNumber;
  }, 250);
}

/** Tells the vendor, in their language (`key` is the wording under common:message). */
function notifyVendor(app: VerificationApplication, key: string, values: (t: TFunction) => Record<string, unknown>) {
  recordAccountMessage(JOB_ACTOR.Vendor, app.vendorId, `common:message.${key}`, values, VENDOR_STANDING_ROUTE);
}

/** POST /admin/verifications/:id/approve — assigns the requested tier everywhere. */
export function approveApplication(id: string): Promise<VerificationApplication> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VerificationDecide);
    const app = find(id);
    requireOwnClaim(app, admin);
    setVendorVerification(app.vendorId, app.requestedTier);
    const tier = tierLabel(app.requestedTier);
    recordAudit(admin, AUDIT_ACTION.VerificationApprove, target(app), { details: `Tier: ${tier}` });
    notifyVendor(app, 'verified', (t) => ({ tier: t(`common:tier.${app.requestedTier}.label`, { defaultValue: tier }) }));
    return toClient(
      save({ ...app, status: VERIFICATION_STATUS.Approved, claim: null, decision: { outcome: 'approved', by: admin.name, at: new Date().toISOString(), message: null, documentsNeeded: [] } })
    );
  }, 600);
}

/** POST /admin/verifications/:id/reject { reason } */
export function rejectApplication(id: string, reason: string): Promise<VerificationApplication> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VerificationDecide);
    const app = find(id);
    requireOwnClaim(app, admin);
    const why = reason.trim();
    if (why.length < 3) throw new ApiError('Give a reason for the rejection.', 400);
    recordAudit(admin, AUDIT_ACTION.VerificationReject, target(app), { reason: why, details: `Requested: ${tierLabel(app.requestedTier)}` });
    notifyVendor(app, 'verificationRejected', () => ({ reason: why }));
    return toClient(
      save({ ...app, status: VERIFICATION_STATUS.Rejected, claim: null, decision: { outcome: 'rejected', by: admin.name, at: new Date().toISOString(), message: why, documentsNeeded: [] } })
    );
  }, 600);
}

/** POST /admin/verifications/:id/more-info { message, documentsNeeded } */
export function requestMoreInfo(id: string, message: string, documentsNeeded: DocumentType[]): Promise<VerificationApplication> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.VerificationDecide);
    const app = find(id);
    requireOwnClaim(app, admin);
    const text = message.trim();
    if (text.length < 10) throw new ApiError('Tell the vendor what you need (at least 10 characters).', 400);
    if (documentsNeeded.length === 0) throw new ApiError('Choose at least one document the vendor must upload.', 400);
    const needed = documentsNeeded.map((d) => DOCUMENT_TYPE_LABELS[d]).join(', ');
    recordAudit(admin, AUDIT_ACTION.VerificationRequestInfo, target(app), { reason: text, details: `Needs: ${needed}` });
    notifyVendor(app, 'verificationMoreInfo', (t) => ({
      text,
      needed: documentsNeeded.map((d) => t(`vendor:verification.docType.${d}`, { defaultValue: DOCUMENT_TYPE_LABELS[d] })).join(', ')
    }));
    return toClient(
      save({
        ...app,
        status: VERIFICATION_STATUS.MoreInfo,
        claim: null,
        decision: { outcome: 'more_info', by: admin.name, at: new Date().toISOString(), message: text, documentsNeeded }
      })
    );
  }, 600);
}

/** Sync read for analytics. */
export const applicationsSnapshot = (): readonly VerificationApplication[] => applications;

/* ---------- Vendor: their own application ---------- */

/** GET /vendor/verification — the vendor's latest application (masked) and current tier. */
export function getMyVerification(vendorId: string): Promise<{tier: Verification;application: VerificationApplication | null;}> {
  return mockResponse(() => {
    const vendor = getAllVendors().find((v) => v.id === vendorId);
    if (!vendor) throw new ApiError('We couldn’t find your profile.', 404);
    const latest = applications.filter((a) => a.vendorId === vendorId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null;
    return { tier: vendor.verification, application: latest ? toClient(latest) : null };
  }, 300);
}

/**
 * POST /vendor/verification/documents — the vendor uploads what was asked for (MOCK: the files aren't
 * stored; a specimen image stands in). After "more info" the same application goes back to the queue;
 * after a rejection a new application is opened for the same tier.
 */
export function resubmitDocuments(vendorId: string, uploads: {type: DocumentType;fileName: string;}[]): Promise<VerificationApplication> {
  return mockResponse(() => {
    if (uploads.length === 0) throw new ApiError('Choose at least one document to upload.', 400);
    const latest = applications.filter((a) => a.vendorId === vendorId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    if (!latest || latest.status !== VERIFICATION_STATUS.MoreInfo && latest.status !== VERIFICATION_STATUS.Rejected) {
      throw new ApiError('There’s nothing to resubmit right now.', 409);
    }
    const now = new Date().toISOString();
    const docs = uploads.map((u) => ({
      id: `doc-up-${nextDoc++}`,
      type: u.type,
      fileUrl: DOCUMENT_PLACEHOLDERS[u.type],
      nameOnDocument: `${latest.applicantName} (uploaded as ${u.fileName})`,
      idNumber: null,
      expiresOn: null,
      uploadedAt: now
    }));
    if (latest.status === VERIFICATION_STATUS.MoreInfo) {
      return toClient(save({ ...latest, status: VERIFICATION_STATUS.Pending, documents: [...latest.documents, ...docs], resubmittedAt: now }));
    }
    const fresh: VerificationApplication = {
      ...latest,
      id: `ver-${nextId++}`,
      submittedAt: now,
      status: VERIFICATION_STATUS.Pending,
      documents: docs,
      checks: {},
      notes: '',
      claim: null,
      decision: null,
      resubmittedAt: now
    };
    applications = [fresh, ...applications];
    return toClient(fresh);
  }, 700);
}
