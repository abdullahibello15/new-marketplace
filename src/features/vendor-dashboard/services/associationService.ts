import i18n from '../../../i18n';
import { addMonths, startOfDay } from 'date-fns';
import { ApiError } from '../../../services/mockApi';
import { isNigerianMobile, stripPhone, toE164 } from '../../../utils/phone';
import { BUNDLE_RULES } from '../bundles';
import { ASSOCIATION_MEMBER_STATUS } from '../constants';
import { mockAssociations, mockVendorContacts } from '../mock/associations';
import type { Association, AssociationMember, SubscriptionCoverage } from '../types';

/*
 * MOCK trade association store (our backend's side). Holds associations and their members only.
 * Billing (bundle invoices and what a payment activates) lives in subscriptionService, which reads
 * from here; the admin screen's async API is associationAdminService. This file imports neither,
 * so there are no import cycles.
 */
let associations: Association[] = structuredClone(mockAssociations);
/** MOCK vendor contact directory (grows as invited vendors claim their profiles). */
let contacts = structuredClone(mockVendorContacts);
let nextMemberId = 100;
let nextAssociationId = 1;

const { Active, PendingPayment, Removed } = ASSOCIATION_MEMBER_STATUS;

export function findAssociation(id: string): Association {
  const a = associations.find((x) => x.id === id);
  if (!a) throw new ApiError(i18n.t('vendor:error.noAssociation'), 404);
  return a;
}

function save(updated: Association): Association {
  associations = associations.map((a) => a.id === updated.id ? updated : a);
  return updated;
}

/** Members the next bundle renewal pays for (removed and unpaid members are left out). */
export const billableMembers = (a: Association) => a.members.filter((m) => m.status === Active);
/** Members still counted towards the bundle size (for limits and discount tiers). */
export const countedMembers = (a: Association) => a.members.filter((m) => m.status !== Removed);

/**
 * Is this vendor covered by an association right now? Active members are covered until the bundle's
 * renewal date; removed members until the date they'd already been paid up to. Lapsed cover is still
 * returned (so their grace and suspension run from the bundle's date), until the vendor joins nothing else.
 */
export function coverageFor(vendorId: string): SubscriptionCoverage | null {
  for (const a of associations) {
    const m = a.members.find((x) => x.vendorId === vendorId && (x.status === Active || x.status === Removed));
    if (!m) continue;
    if (m.status === Active) return { associationId: a.id, associationName: a.name, until: a.renewsOn, removed: false };
    if (m.accessUntil) return { associationId: a.id, associationName: a.name, until: m.accessUntil, removed: true };
  }
  return null;
}

/** All associations this vendor is an active or pending member of. */
const membershipsOf = (vendorId: string) =>
associations.filter((a) => a.members.some((m) => m.vendorId === vendorId && m.status !== Removed));

/** MOCK directory lookup by phone or email. */
export function lookupVendorByContact(raw: string): {vendorId: string;vendorName: string;} | null {
  const value = raw.trim();
  if (value.includes('@')) {
    const email = value.toLowerCase();
    return contacts.find((c) => c.email === email) ?? null;
  }
  if (!isNigerianMobile(value)) return null;
  const phone = toE164(stripPhone(value));
  return contacts.find((c) => c.phone === phone) ?? null;
}

/** Every vendor's directory phone (E.164) and email, for duplicate checks. */
export const vendorContactsSnapshot = (): readonly {vendorId: string;vendorName: string;phone: string;email: string;}[] => contacts;

/** A newly claimed vendor joins the contact directory (so they can be found by phone or email). */
export function registerVendorContact(entry: {vendorId: string;vendorName: string;phone: string;email: string | null;}): void {
  contacts = [...contacts.filter((c) => c.vendorId !== entry.vendorId), { ...entry, email: entry.email ?? '' }];
}

/**
 * A new partner association (from the admin's bulk import). Its first bundle period starts today and
 * runs a month, unpaid: members added now are billed prorated to the end of it, like any addition.
 */
export function createAssociationNow(input: {name: string;adminName: string;phone: string;email: string;terms: string;}, now: Date): Association {
  const name = input.name.trim();
  if (associations.some((a) => a.name.trim().toLowerCase() === name.toLowerCase())) throw new ApiError(i18n.t('vendor:error.associationExists', { name }), 409);
  const created: Association = {
    id: `assoc-new-${nextAssociationId++}`,
    name,
    adminName: input.adminName.trim(),
    contactPhone: input.phone,
    contactEmail: input.email.trim().toLowerCase() || null,
    terms: input.terms.trim() || null,
    periodStart: startOfDay(now).toISOString(),
    renewsOn: addMonths(startOfDay(now), 1).toISOString(),
    members: []
  };
  associations = [...associations, created];
  return created;
}

/** Adds a member as "awaiting payment": they're covered once the association pays the prorated amount. */
export function addMemberNow(associationId: string, contact: string, now: Date): AssociationMember {
  const vendor = lookupVendorByContact(contact);
  if (!vendor) throw new ApiError(i18n.t('vendor:error.noVendorContact'), 404);
  return addVendorMemberNow(associationId, { ...vendor, contact }, now);
}

/** The same, for a vendor already identified (bulk import: existing vendors and newly invited ones). */
export function addVendorMemberNow(associationId: string, vendor: {vendorId: string;vendorName: string;contact: string;}, now: Date): AssociationMember {
  const a = findAssociation(associationId);
  const existing = a.members.find((m) => m.vendorId === vendor.vendorId && m.status !== Removed);
  if (existing) throw new ApiError(i18n.t('vendor:error.alreadyMember', { name: vendor.vendorName }), 409);
  if (membershipsOf(vendor.vendorId).some((x) => x.id !== a.id)) throw new ApiError(i18n.t('vendor:error.otherAssociation', { name: vendor.vendorName }), 409);
  if (countedMembers(a).length >= BUNDLE_RULES.maxMembers) throw new ApiError(i18n.t('vendor:error.bundleMax', { max: BUNDLE_RULES.maxMembers }), 409);
  const member: AssociationMember = {
    id: `m${nextMemberId++}`,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    contact: vendor.contact.trim(),
    status: PendingPayment,
    addedAt: now.toISOString(),
    coveredFrom: null,
    removedAt: null,
    accessUntil: null
  };
  // Re-adding someone who was removed replaces their old row.
  save({ ...a, members: [...a.members.filter((m) => m.vendorId !== vendor.vendorId), member] });
  return member;
}

/**
 * Removes a member. Not yet paid for: simply dropped. Covered: no refund, and they keep access until
 * the end of the period already paid; they're left out of the next renewal.
 */
export function removeMemberNow(associationId: string, memberId: string, now: Date): AssociationMember {
  const a = findAssociation(associationId);
  const m = a.members.find((x) => x.id === memberId);
  if (!m || m.status === Removed) throw new ApiError(i18n.t('vendor:error.notMember'), 404);
  if (m.status === PendingPayment) {
    save({ ...a, members: a.members.filter((x) => x.id !== memberId) });
    return { ...m, status: Removed, removedAt: now.toISOString(), accessUntil: null };
  }
  const removed: AssociationMember = { ...m, status: Removed, removedAt: now.toISOString(), accessUntil: a.renewsOn };
  save({ ...a, members: a.members.map((x) => x.id === memberId ? removed : x) });
  return removed;
}

/** A paid bundle renewal: the next period for every member it covered. */
export function applyBundleRenewal(associationId: string, periodStart: string, periodEnd: string): Association {
  const a = findAssociation(associationId);
  return save({ ...a, periodStart, renewsOn: periodEnd });
}

/** A paid member addition: those members are covered from now until the bundle's renewal date. */
export function activateMembers(associationId: string, memberIds: string[], at: string): Association {
  const a = findAssociation(associationId);
  return save({
    ...a,
    members: a.members.map((m) => memberIds.includes(m.id) && m.status === PendingPayment ? { ...m, status: Active, coveredFrom: at } : m)
  });
}

export const allAssociations = (): readonly Association[] => associations;
