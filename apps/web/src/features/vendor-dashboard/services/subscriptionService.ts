import i18n from '../../../i18n';
import { addDays, max, startOfDay, subMonths } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { BUNDLE_RULES } from '../bundles';
import { ASSOCIATION_MEMBER_STATUS, INVOICE_KIND, INVOICE_STATUS, PLAN_ID, SUBSCRIPTION_STATUS } from '../constants';
import { mockDirectorySubscriptions, mockHistoryInvoices, mockInvoices, mockSubscription } from '../mock/subscription';
import { PLANS, PLAN_FEATURES, planById } from '../plans';
import { quoteChange } from '../utils/billing';
import { quoteBundle, quoteMemberAdditions } from '../utils/bundle';
import { getSubscriptionStatus, isSuspended, nextPeriod } from '../utils/subscription';
import { activateMembers, allAssociations, applyBundleRenewal, billableMembers, countedMembers, coverageFor, findAssociation } from './associationService';
import { scheduleAssociationReminders, scheduleVendorReminders } from './subscriptionReminders';
import type { PaymentMethod } from '../../payments/types';
import type { Vendor } from '../../../types/marketplace';
import type { Invoice, InvoiceQuote, PlanCatalogue, PlanId, Subscription, VendorStanding } from '../types';
import { currentVendorId } from '../../auth/session';

/*
 * Vendor subscriptions and invoices (our backend, mocked). Prices and rules come from plans.ts,
 * bundles.ts and utils/billing.ts / utils/bundle.ts. Plan changes, renewals and association bundles
 * never take effect here directly: they create an invoice, it's paid on the shared payment screen, and
 * the payment service calls markInvoicePaid once the payment provider has confirmed it.
 */
const subscriptions = new Map<string, Subscription>([mockSubscription, ...mockDirectorySubscriptions].map((s) => [s.vendorId, structuredClone(s)]));
let invoices: Invoice[] = structuredClone([...mockInvoices, ...mockHistoryInvoices]);
let nextInvoice = 1005;

/** A paid downgrade (or plan change at renewal) switches over once its start date arrives. */
function applyScheduledChange(sub: Subscription, now = new Date()): Subscription {
  if (!sub.scheduledChange || new Date(sub.scheduledChange.effectiveAt) > now) return sub;
  const next = { ...sub, planId: sub.scheduledChange.planId, scheduledChange: null };
  subscriptions.set(sub.vendorId, next);
  return next;
}

/**
 * The subscription as it applies right now. Covered by an association: the bundle's plan and renewal
 * date. Removed from one: their own record, but never ending before the date they were paid up to.
 */
function effectiveSubscription(record: Subscription): Subscription {
  const sub = applyScheduledChange(record);
  const coverage = coverageFor(sub.vendorId);
  if (!coverage) return { ...sub, coveredBy: null };
  if (coverage.removed) {
    const renewsOn = max([new Date(sub.renewsOn), new Date(coverage.until)]).toISOString();
    return { ...sub, renewsOn, coveredBy: new Date(coverage.until) >= new Date() ? coverage : null };
  }
  const a = findAssociation(coverage.associationId);
  return { ...sub, planId: BUNDLE_RULES.memberPlanId, periodStart: a.periodStart, renewsOn: coverage.until, scheduledChange: null, coveredBy: coverage };
}

function ownSubscription(vendorId = currentVendorId()): Subscription {
  const record = subscriptions.get(vendorId);
  if (!record) throw new ApiError(i18n.t('vendor:error.noSubscription'), 404);
  return effectiveSubscription(record);
}

/** Covered members can't pay separately while their association's bundle pays for them. */
function assertNotCovered(sub: Subscription): void {
  if (sub.coveredBy && !sub.coveredBy.removed) {
    throw new ApiError(i18n.t('vendor:error.covered', { name: sub.coveredBy.associationName }), 409);
  }
}

/* ---------- Admin suspensions (moderation) ---------- */

/**
 * Vendors suspended by Gwani's moderation team. It's the same soft suspension as a lapsed subscription
 * (still listed, ranked lower, "temporarily unavailable", no new requests, orders or quotes; existing
 * work, payouts and data are kept), so it goes through vendorStanding like every other suspension.
 */
const adminSuspensions = new Map<string, NonNullable<VendorStanding['adminSuspension']>>();

/** POST /admin/vendors/:id/suspension — called by the admin moderation service. */
export function suspendVendorByAdmin(vendorId: string, reason: string, at = new Date().toISOString()): void {
  adminSuspensions.set(vendorId, { reason, at });
}

/** DELETE /admin/vendors/:id/suspension */
export function liftAdminSuspension(vendorId: string): void {
  adminSuspensions.delete(vendorId);
}

/** Why a suspended vendor can't take new work, in words for the vendor. */
export function suspensionMessage(vendorId: string): string {
  const admin = adminSuspensions.get(vendorId);
  return admin ?
  i18n.t('vendor:error.adminSuspended', { reason: admin.reason }) :
  i18n.t('vendor:error.subscriptionSuspended');
}

/* ---------- Standing: the one status every part of the app uses ---------- */

/**
 * Where a vendor stands right now, from the single status helper (utils/subscription.getSubscriptionStatus),
 * or Suspended while Gwani's moderation team has suspended them. Search ranking, booking and requests, and
 * the dashboard banner all read this. Vendors with no subscription record and no association (most of the
 * mock directory) are treated as active.
 */
export function vendorStanding(vendorId: string, now = new Date()): VendorStanding {
  const adminSuspension = adminSuspensions.get(vendorId) ?? null;
  const byAdmin = (s: Omit<VendorStanding, 'adminSuspension'>): VendorStanding =>
  adminSuspension ? { ...s, status: SUBSCRIPTION_STATUS.Suspended, adminSuspension } : { ...s, adminSuspension: null };
  const record = subscriptions.get(vendorId);
  if (record) {
    const sub = effectiveSubscription(record);
    return byAdmin({ status: getSubscriptionStatus(sub.renewsOn, now), renewsOn: sub.renewsOn, coveredBy: sub.coveredBy });
  }
  const coverage = coverageFor(vendorId);
  if (coverage) return byAdmin({ status: getSubscriptionStatus(coverage.until, now), renewsOn: coverage.until, coveredBy: coverage });
  return byAdmin({ status: SUBSCRIPTION_STATUS.Active, renewsOn: null, coveredBy: null });
}

/** Soft-suspended: still listed (ranked lower), but no new requests, orders or quotes. */
export const isVendorSuspended = (vendorId: string, now = new Date()) => vendorStanding(vendorId, now).status === SUBSCRIPTION_STATUS.Suspended;

/** The reason customers see on a suspended vendor's profile; booking is blocked by the existing "unavailable" checks. */
export const SUSPENDED_REASON = 'Temporarily unavailable';

/**
 * The vendor as customers should see them. Suspended: marked temporarily unavailable, which disables
 * Book Now / Request and refuses new requests and orders. Their profile, photos and reviews stay.
 */
export function withListingRestrictions(vendor: Vendor, now = new Date()): Vendor {
  if (vendor.unavailable || !isVendorSuspended(vendor.id, now)) return vendor;
  return { ...vendor, unavailable: { reason: SUSPENDED_REASON, until: null } };
}

/**
 * A new provider's first subscription record (called by the auth service when they finish signing up):
 * the Starter plan for a free trial period, after which the usual renewal, grace and soft-suspension rules
 * apply. Does nothing if they already have one.
 */
export function startProviderTrialNow(vendorId: string, trialDays: number, now = new Date()): void {
  if (subscriptions.has(vendorId)) return;
  const start = now.toISOString();
  subscriptions.set(vendorId, { vendorId, planId: PLAN_ID.Starter, periodStart: start, renewsOn: addDays(startOfDay(now), trialDays).toISOString(), startedAt: start, scheduledChange: null, coveredBy: null });
}

/** The plan currently in force (the bundle's plan for covered members), for limit checks. */
export function currentPlanFor(vendorId: string) {
  const record = subscriptions.get(vendorId);
  if (record) return planById(effectiveSubscription(record).planId);
  return coverageFor(vendorId) ? planById(BUNDLE_RULES.memberPlanId) : null;
}

/* ---------- Reads ---------- */

/** GET /vendor/subscription — including "covered by" when an association pays. */
export function getSubscription(): Promise<Subscription> {
  return mockResponse(() => ownSubscription());
}

/** GET /plans */
export function getPlanCatalogue(): Promise<PlanCatalogue> {
  return mockResponse(() => ({ plans: [...PLANS], features: [...PLAN_FEATURES] }));
}

/** GET /vendor/invoices — the vendor's own invoices (not their association's), newest first. */
export function listInvoices(): Promise<Invoice[]> {
  return mockResponse(() =>
  invoices.filter((i) => i.vendorId === currentVendorId() && i.associationId === null).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
}

/** GET /associations/:id/invoices — the association's bundle invoices, for its admin. */
export function listAssociationInvoices(associationId: string): Promise<Invoice[]> {
  return mockResponse(() => invoices.filter((i) => i.associationId === associationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

/** GET /invoices/:id */
export function getInvoice(id: string): Promise<Invoice> {
  return mockResponse(() => findInvoice(id), 250);
}

/** Sync lookup for the payment service (same "backend"). */
export function findInvoice(id: string): Invoice {
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiError(i18n.t('vendor:error.noInvoice'), 404);
  return invoice;
}

function addInvoice(fields: Omit<Invoice, 'id' | 'status' | 'createdAt' | 'paidAt' | 'paymentReference' | 'method'>, replaces: (i: Invoice) => boolean): Invoice {
  invoices = invoices.map((i) => i.status === INVOICE_STATUS.Open && replaces(i) ? { ...i, status: INVOICE_STATUS.Void } : i);
  const invoice: Invoice = { ...fields, id: `INV-${nextInvoice++}`, status: INVOICE_STATUS.Open, createdAt: new Date().toISOString(), paidAt: null, paymentReference: null, method: null };
  invoices = [invoice, ...invoices];
  return invoice;
}

/* ---------- Plan changes and renewals (vendors paying for themselves) ---------- */

/** POST /vendor/subscription/quote — what a renewal or plan change would cost, with the working. Nothing is saved. */
export function quotePlanChange(planId: PlanId): Promise<InvoiceQuote> {
  return mockResponse(() => {
    planById(planId);
    const sub = ownSubscription();
    assertNotCovered(sub);
    return quoteChange(sub, planId, new Date());
  }, 300);
}

/**
 * POST /vendor/invoices — creates the invoice to pay for a renewal or plan change. The amount is
 * recalculated here, never taken from the browser. Any older unpaid invoice is replaced.
 */
export function createInvoice(planId: PlanId): Promise<Invoice> {
  return mockResponse(() => {
    const sub = ownSubscription();
    assertNotCovered(sub);
    const quote = quoteChange(sub, planId, new Date());
    if (quote.amount <= 0) throw new ApiError(i18n.t('vendor:error.nothingToPay'), 400);
    return addInvoice({ ...quote, vendorId: sub.vendorId, associationId: null, memberIds: [] }, (i) => i.vendorId === sub.vendorId && i.associationId === null);
  }, 500);
}

/**
 * POST /vendor/subscription/renew — the invoice for renewing the current plan for another period.
 * Renewal is manual for now (auto-billing needs a backend and a saved PSP authorization): the vendor
 * pays this invoice on the shared payment screen, and the end date moves once the payment is verified.
 */
export function renewSubscription(): Promise<Invoice> {
  return createInvoice(ownSubscription().planId);
}

/**
 * POST /vendor/subscription/plan { planId } — the invoice for switching plan: a prorated upgrade that
 * applies as soon as it's paid, or a downgrade that's paid now and starts when the current period ends.
 */
export function changePlan(planId: PlanId): Promise<Invoice> {
  const sub = ownSubscription();
  // Once suspended, any plan (including the old one) is a fresh subscription.
  if (planId === sub.planId && !isSuspended(sub.renewsOn)) return Promise.reject(new ApiError(i18n.t('vendor:error.samePlan'), 409));
  return createInvoice(planId);
}

/* ---------- Association bundles ---------- */

function bundleRenewalQuote(associationId: string, now: Date): InvoiceQuote & {memberIds: string[];} {
  const a = findAssociation(associationId);
  const members = billableMembers(a);
  if (members.length < BUNDLE_RULES.minMembers) {
    throw new ApiError(i18n.t('vendor:error.bundleMin', { min: BUNDLE_RULES.minMembers, count: members.length }), 409);
  }
  const plan = planById(BUNDLE_RULES.memberPlanId);
  const q = quoteBundle(members.map((m) => m.vendorName), plan.price, plan.name);
  const period = nextPeriod(a.renewsOn, now);
  return {
    kind: INVOICE_KIND.BundleRenewal,
    planId: plan.id,
    fromPlanId: plan.id,
    amount: q.total,
    lines: q.lines,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    effectiveAt: (new Date(a.renewsOn) > now ? period.start : now).toISOString(),
    memberIds: members.map((m) => m.id)
  };
}

function bundleAdditionsQuote(associationId: string, now: Date): InvoiceQuote & {memberIds: string[];} {
  const a = findAssociation(associationId);
  const pending = a.members.filter((m) => m.status === ASSOCIATION_MEMBER_STATUS.PendingPayment);
  if (pending.length === 0) throw new ApiError(i18n.t('vendor:error.noPendingMembers'), 409);
  if (new Date(a.renewsOn) < now) throw new ApiError(i18n.t('vendor:error.bundleLapsed'), 409);
  const plan = planById(BUNDLE_RULES.memberPlanId);
  const q = quoteMemberAdditions(pending.map((m) => m.vendorName), countedMembers(a).length, plan.price, a.periodStart, a.renewsOn, now);
  return {
    kind: INVOICE_KIND.BundleMembers,
    planId: plan.id,
    fromPlanId: plan.id,
    amount: q.total,
    lines: q.lines,
    periodStart: startOfDay(now).toISOString(),
    periodEnd: a.renewsOn,
    effectiveAt: now.toISOString(),
    memberIds: pending.map((m) => m.id)
  };
}

/** What the association's next renewal and any pending additions would cost (null when not possible, with why). */
export function quoteAssociationBilling(associationId: string, now = new Date()) {
  const attempt = <T,>(f: () => T): {quote: T | null;blockedReason: string | null;} => {
    try {
      return { quote: f(), blockedReason: null };
    } catch (e) {
      return { quote: null, blockedReason: e instanceof Error ? e.message : 'Not available.' };
    }
  };
  return { renewal: attempt(() => bundleRenewalQuote(associationId, now)), additions: attempt(() => bundleAdditionsQuote(associationId, now)) };
}

/**
 * POST /associations/:id/invoices { kind } — one invoice for the whole bundle (one line per member,
 * then the discount), or a prorated invoice for members added mid-period. Paid like any invoice.
 */
export function createBundleInvoice(associationId: string, kind: 'renewal' | 'additions'): Promise<Invoice> {
  return mockResponse(() => {
    const now = new Date();
    const q = kind === 'renewal' ? bundleRenewalQuote(associationId, now) : bundleAdditionsQuote(associationId, now);
    return addInvoice({ ...q, vendorId: associationId, associationId }, (i) => i.associationId === associationId && i.kind === q.kind);
  }, 500);
}

/* ---------- Payment confirmed ---------- */

/**
 * Called by the payment service once a subscription payment is verified as Paid. Idempotent.
 * - Vendor upgrade / subscribe: the new plan applies now. Renew / downgrade: the end date moves out;
 *   a different plan is scheduled for the period start. Their renewal reminders are rescheduled.
 * - Bundle renewal: every covered member is extended to the same new date. Bundle additions: the new
 *   members are covered now. Admin and member reminders are rescheduled.
 */
export function markInvoicePaid(id: string, payment: {reference: string;method: PaymentMethod;paidAt: string;}): Invoice {
  const invoice = findInvoice(id);
  if (invoice.status === INVOICE_STATUS.Paid) return invoice;
  const paid: Invoice = { ...invoice, status: INVOICE_STATUS.Paid, paidAt: payment.paidAt, paymentReference: payment.reference, method: payment.method };
  invoices = invoices.map((i) => i.id === id ? paid : i);

  if (invoice.associationId) {
    if (invoice.kind === INVOICE_KIND.BundleRenewal) applyBundleRenewal(invoice.associationId, invoice.periodStart, invoice.periodEnd);else
    activateMembers(invoice.associationId, invoice.memberIds, payment.paidAt);
    scheduleAssociationReminders(invoice.associationId, 'Bundle paid: rescheduled');
    return paid;
  }

  const sub = subscriptions.get(invoice.vendorId);
  if (!sub) return paid;
  const now = new Date(payment.paidAt);
  let next: Subscription;
  if (invoice.kind === INVOICE_KIND.Subscribe) {
    next = { ...sub, planId: invoice.planId, periodStart: invoice.periodStart, renewsOn: invoice.periodEnd, startedAt: payment.paidAt, scheduledChange: null };
  } else if (invoice.kind === INVOICE_KIND.Upgrade) {
    next = { ...sub, planId: invoice.planId, scheduledChange: null, renewsOn: new Date(invoice.periodEnd) > new Date(sub.renewsOn) ? invoice.periodEnd : sub.renewsOn };
  } else {
    const startsNow = new Date(invoice.effectiveAt) <= now;
    next = {
      ...sub,
      renewsOn: invoice.periodEnd,
      periodStart: startsNow ? invoice.periodStart : sub.periodStart,
      planId: startsNow ? invoice.planId : sub.planId,
      scheduledChange: !startsNow && invoice.planId !== sub.planId ? { planId: invoice.planId, effectiveAt: invoice.effectiveAt, invoiceId: invoice.id } : null
    };
  }
  subscriptions.set(sub.vendorId, next);
  // Renewed: the old reminders stop. Changed plan: the new ones name the new plan.
  scheduleVendorReminders(next, 'Renewed or changed plan: rescheduled');
  return paid;
}

/* ---------- Reads for Gwani's admin analytics ---------- */

/** Every vendor's subscription as it applies now (bundle cover included), read-only. */
export const subscriptionsSnapshot = (): Subscription[] => [...subscriptions.values()].map(effectiveSubscription);

/** Every subscription invoice on the platform, read-only. */
export const invoicesSnapshot = (): readonly Invoice[] => invoices;

/* ---------- MOCK demo controls ---------- */

export type DemoSubscriptionState = 'active' | 'expiring' | 'grace' | 'suspended';
const DEMO_OFFSETS: Record<DemoSubscriptionState, number> = { active: 20, expiring: 3, grace: -1, suspended: -10 };

const endOfDayIn = (days: number) => new Date(addDays(startOfDay(new Date()), days).getTime() + 86_399_999).toISOString();

/** Moves the demo vendor's own end date so expiry, grace and suspension can be tried. Reminders follow. */
export function simulateSubscriptionState(state: DemoSubscriptionState): Promise<Subscription> {
  return mockResponse(() => {
    const record = subscriptions.get(currentVendorId());
    if (!record) throw new ApiError(i18n.t('vendor:error.noSubscription'), 404);
    const end = endOfDayIn(DEMO_OFFSETS[state]);
    const next = { ...record, renewsOn: end, periodStart: startOfDay(subMonths(new Date(end), 1)).toISOString() };
    subscriptions.set(record.vendorId, next);
    const effective = effectiveSubscription(next);
    if (!effective.coveredBy) scheduleVendorReminders(effective, 'Demo: dates moved');
    return effective;
  }, 300);
}

/** Moves an association bundle's end date (demo), so member grace and suspension can be tried. */
export function simulateAssociationState(associationId: string, state: DemoSubscriptionState): Promise<void> {
  return mockResponse(() => {
    const end = endOfDayIn(DEMO_OFFSETS[state]);
    applyBundleRenewal(associationId, startOfDay(subMonths(new Date(end), 1)).toISOString(), end);
    scheduleAssociationReminders(associationId, 'Demo: dates moved');
  }, 300);
}

/* ---------- Start-up: renewal reminders for existing subscriptions and bundles ---------- */

for (const record of subscriptions.values()) {
  const sub = effectiveSubscription(record);
  if (!sub.coveredBy) scheduleVendorReminders(sub);
}
for (const a of allAssociations()) scheduleAssociationReminders(a.id);
