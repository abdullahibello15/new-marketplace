import { addDays, startOfDay, subMonths } from 'date-fns';
import { vendorAccount } from '../../../data/vendorPortal';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { INVOICE_KIND, INVOICE_STATUS } from '../constants';
import { mockInvoices, mockSubscription } from '../mock/subscription';
import { PLANS, PLAN_FEATURES, planById } from '../plans';
import { quoteChange } from '../utils/billing';
import { isProfileLimited } from '../utils/subscription';
import type { PaymentMethod } from '../../payments/types';
import type { Vendor } from '../../../types/marketplace';
import type { Invoice, InvoiceQuote, PlanCatalogue, PlanId, Subscription } from '../types';

/*
 * Vendor subscriptions and invoices (our backend, mocked). Prices and rules come from plans.ts and
 * utils/billing.ts. Plan changes and renewals never happen here directly: they create an invoice, the
 * vendor pays it on the shared payment screen, and the payment service calls markInvoicePaid once the
 * payment provider has confirmed it.
 */
const subscriptions = new Map<string, Subscription>([[mockSubscription.vendorId, structuredClone(mockSubscription)]]);
let invoices: Invoice[] = structuredClone(mockInvoices);
let nextInvoice = 1005;

function ownSubscription(vendorId = vendorAccount.vendorId): Subscription {
  const sub = subscriptions.get(vendorId);
  if (!sub) throw new ApiError('No subscription found.', 404);
  return applyScheduledChange(sub);
}

/** A paid downgrade (or plan change at renewal) switches over once its start date arrives. */
function applyScheduledChange(sub: Subscription, now = new Date()): Subscription {
  if (!sub.scheduledChange || new Date(sub.scheduledChange.effectiveAt) > now) return sub;
  const next = { ...sub, planId: sub.scheduledChange.planId, scheduledChange: null };
  subscriptions.set(sub.vendorId, next);
  return next;
}

/* ---------- Reads ---------- */

/** GET /vendor/subscription */
export function getSubscription(): Promise<Subscription> {
  return mockResponse(() => ownSubscription());
}

/** GET /plans */
export function getPlanCatalogue(): Promise<PlanCatalogue> {
  return mockResponse(() => ({ plans: [...PLANS], features: [...PLAN_FEATURES] }));
}

/** GET /vendor/invoices — newest first. */
export function listInvoices(): Promise<Invoice[]> {
  return mockResponse(() => invoices.filter((i) => i.vendorId === vendorAccount.vendorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

/** GET /vendor/invoices/:id */
export function getInvoice(id: string): Promise<Invoice> {
  return mockResponse(() => findInvoice(id), 250);
}

/** Sync lookup for the payment service (same "backend"). */
export function findInvoice(id: string): Invoice {
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) throw new ApiError('We couldn’t find that invoice.', 404);
  return invoice;
}

/* ---------- Plan changes and renewals ---------- */

/** POST /vendor/subscription/quote — what a renewal or plan change would cost, with the working. Nothing is saved. */
export function quotePlanChange(planId: PlanId): Promise<InvoiceQuote> {
  return mockResponse(() => {
    planById(planId);
    return quoteChange(ownSubscription(), planId, new Date());
  }, 300);
}

/**
 * POST /vendor/invoices — creates the invoice to pay for a renewal or plan change. The amount is
 * recalculated here, never taken from the browser. Any older unpaid invoice is replaced.
 */
export function createInvoice(planId: PlanId): Promise<Invoice> {
  return mockResponse(() => {
    const sub = ownSubscription();
    const quote = quoteChange(sub, planId, new Date());
    if (quote.amount <= 0) throw new ApiError('Nothing to pay for this change.', 400);
    invoices = invoices.map((i) => i.vendorId === sub.vendorId && i.status === INVOICE_STATUS.Open ? { ...i, status: INVOICE_STATUS.Void } : i);
    const invoice: Invoice = {
      ...quote,
      id: `INV-${nextInvoice++}`,
      vendorId: sub.vendorId,
      status: INVOICE_STATUS.Open,
      createdAt: new Date().toISOString(),
      paidAt: null,
      paymentReference: null,
      method: null
    };
    invoices = [invoice, ...invoices];
    return invoice;
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
  // After the grace period any plan, including the old one, is a fresh subscription.
  if (planId === sub.planId && !isProfileLimited(sub.renewsOn)) return Promise.reject(new ApiError('You’re already on this plan. Use Renew to extend it.', 409));
  return createInvoice(planId);
}

/**
 * Called by the payment service once a subscription payment is verified as Paid. Idempotent.
 * - Upgrade / subscribe: the new plan applies now.
 * - Renew / downgrade: the end date moves out; a different plan is scheduled for the period start.
 */
export function markInvoicePaid(id: string, payment: {reference: string;method: PaymentMethod;paidAt: string;}): Invoice {
  const invoice = findInvoice(id);
  if (invoice.status === INVOICE_STATUS.Paid) return invoice;
  const paid: Invoice = { ...invoice, status: INVOICE_STATUS.Paid, paidAt: payment.paidAt, paymentReference: payment.reference, method: payment.method };
  invoices = invoices.map((i) => i.id === id ? paid : i);

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
  return paid;
}

/* ---------- Effects on the vendor's public listing ---------- */

/** Past the grace period: hidden from search and not taking new requests. Vendors without a subscription record are unaffected. */
export function isVendorLimited(vendorId: string, now = new Date()): boolean {
  const sub = subscriptions.get(vendorId);
  return sub ? isProfileLimited(sub.renewsOn, now) : false;
}

/** The vendor as customers should see them: marked unavailable while the profile is limited, which blocks requests and orders. */
export function withListingRestrictions(vendor: Vendor, now = new Date()): Vendor {
  if (vendor.unavailable || !isVendorLimited(vendor.id, now)) return vendor;
  return { ...vendor, unavailable: { reason: 'Not taking new requests right now', until: null } };
}

/** The plan currently in force, for limit checks. */
export function currentPlanFor(vendorId: string) {
  const sub = subscriptions.get(vendorId);
  return sub ? planById(applyScheduledChange(sub).planId) : null;
}

/* ---------- MOCK demo controls ---------- */

export type DemoSubscriptionState = 'active' | 'expiring' | 'grace' | 'limited';

/** Moves the demo subscription's end date so expiry, grace and the limited profile can be tried. */
export function simulateSubscriptionState(state: DemoSubscriptionState): Promise<Subscription> {
  return mockResponse(() => {
    const sub = ownSubscription();
    const today = startOfDay(new Date());
    const offset = { active: 20, expiring: 3, grace: -1, limited: -10 }[state];
    const end = new Date(addDays(today, offset).getTime() + 86_399_999).toISOString();
    const next = { ...sub, renewsOn: end, periodStart: startOfDay(subMonths(new Date(end), 1)).toISOString() };
    subscriptions.set(sub.vendorId, next);
    return next;
  }, 300);
}
