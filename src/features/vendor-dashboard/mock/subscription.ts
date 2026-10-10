import { addMonths, endOfDay, startOfDay, subMonths } from 'date-fns';
import { vendorAccount } from '../../../data/vendorPortal';
import { INVOICE_KIND, INVOICE_STATUS, PLAN_ID } from '../constants';
import { formerVendors } from '../../../data/formerVendors';
import { quoteBundle } from '../utils/bundle';
import { mockAssociations } from './associations';
import { daysFromNow } from './time';
import type { Invoice, Subscription } from '../types';

/** Standard plan that renews in 5 days, so the "ends soon" warning shows by default. */
const renewsOn = daysFromNow(5, 23, 59);
const periodStart = startOfDay(subMonths(new Date(renewsOn), 1)).toISOString();

export const mockSubscription: Subscription = {
  vendorId: vendorAccount.vendorId,
  planId: PLAN_ID.Standard,
  periodStart,
  renewsOn,
  startedAt: daysFromNow(-120, 10),
  scheduledChange: null,
  coveredBy: null
};

/** Past invoices: three monthly Standard renewals and the original Starter sign-up. */
function paidInvoice(id: string, monthsAgo: number, planId: Invoice['planId'], kind: Invoice['kind'], method: Invoice['method'], amount: number): Invoice {
  const start = startOfDay(subMonths(new Date(periodStart), monthsAgo));
  const paidAt = new Date(start.getTime() - 2 * 86_400_000).toISOString();
  return {
    id,
    vendorId: vendorAccount.vendorId,
    associationId: null,
    memberIds: [],
    kind,
    planId,
    fromPlanId: planId,
    amount,
    lines: [{ label: `${planId === PLAN_ID.Starter ? 'Starter' : 'Standard'}, 1 month`, amount }],
    periodStart: start.toISOString(),
    periodEnd: endOfDay(addMonths(start, 1)).toISOString(),
    effectiveAt: start.toISOString(),
    status: INVOICE_STATUS.Paid,
    createdAt: paidAt,
    paidAt,
    paymentReference: `GW-SUB-${id.slice(4)}`,
    method
  };
}

export const mockInvoices: Invoice[] = [
paidInvoice('INV-1004', 0, PLAN_ID.Standard, INVOICE_KIND.Renew, 'transfer', 7000),
paidInvoice('INV-1003', 1, PLAN_ID.Standard, INVOICE_KIND.Renew, 'card', 7000),
paidInvoice('INV-1002', 2, PLAN_ID.Standard, INVOICE_KIND.Upgrade, 'ussd', 7000),
paidInvoice('INV-1001', 3, PLAN_ID.Starter, INVOICE_KIND.Subscribe, 'card', 2000)];

/* ---------- Every other vendor's subscription, and the payment history behind it ---------- */

/** End of the day `days` from today. */
const endIn = (days: number) => endOfDay(new Date(Date.now() + days * 86_400_000)).toISOString();

interface DirectorySeed {
  vendorId: string;
  planId: Invoice['planId'];
  /** Days until the current period ends (negative = already lapsed: grace, then suspended). */
  endsInDays: number;
  /** Months of paid history, the first one being the sign-up. */
  months: number;
  /** Before this many months ago they were on `from` (an upgrade or downgrade). */
  change?: {monthsAgo: number;from: Invoice['planId'];};
  /** Months with no payment (the subscription lapsed, then they came back): these "months ago" are skipped. */
  gap?: number[];
}

/**
 * MOCK: directory vendors paying for themselves (association members and the demo vendor are covered
 * elsewhere). Most are active and a few expire soon. Kontagora Fresh Mart is in its grace period and
 * Swift Wheels is suspended, so the soft-suspension rules apply to them across the app.
 */
const DIRECTORY: DirectorySeed[] = [
{ vendorId: 'hauwa-tailoring', planId: PLAN_ID.Standard, endsInDays: 18, months: 22 },
{ vendorId: 'ibrahim-electrical', planId: PLAN_ID.Premium, endsInDays: 9, months: 24, change: { monthsAgo: 10, from: PLAN_ID.Standard } },
// Lapsed for two months about nine months ago, then came back (a win-back).
{ vendorId: 'zainab-dispatch', planId: PLAN_ID.Starter, endsInDays: 4, months: 20, gap: [9, 8] },
{ vendorId: 'fatima-fresh-foods', planId: PLAN_ID.Standard, endsInDays: 21, months: 18, change: { monthsAgo: 7, from: PLAN_ID.Starter } },
{ vendorId: 'kure-market-grocery', planId: PLAN_ID.Starter, endsInDays: 2, months: 8 },
{ vendorId: 'swift-wheels', planId: PLAN_ID.Starter, endsInDays: -12, months: 14 },
// Missed one month four months ago, then came back.
{ vendorId: 'paiko-cool-electrical', planId: PLAN_ID.Standard, endsInDays: 12, months: 16, gap: [4] },
{ vendorId: 'suleja-power-electrical', planId: PLAN_ID.Standard, endsInDays: 25, months: 12, change: { monthsAgo: 3, from: PLAN_ID.Premium } },
{ vendorId: 'abdullahi-mechanic', planId: PLAN_ID.Starter, endsInDays: 6, months: 6 },
{ vendorId: 'chidi-carpentry', planId: PLAN_ID.Premium, endsInDays: 15, months: 9, change: { monthsAgo: 2, from: PLAN_ID.Standard } },
{ vendorId: 'bida-royal-tailors', planId: PLAN_ID.Standard, endsInDays: 27, months: 15 },
{ vendorId: 'kontagora-fresh-mart', planId: PLAN_ID.Starter, endsInDays: -3, months: 5 },
{ vendorId: 'bosso-greens', planId: PLAN_ID.Starter, endsInDays: 20, months: 3 },
{ vendorId: 'sadiya-stitches', planId: PLAN_ID.Starter, endsInDays: 14, months: 2 }];


const PRICES: Record<Invoice['planId'], number> = { starter: 2000, standard: 7000, premium: 15000 };
const PLAN_NAMES: Record<Invoice['planId'], string> = { starter: 'Starter', standard: 'Standard', premium: 'Premium' };
const METHODS: NonNullable<Invoice['method']>[] = ['card', 'ussd', 'transfer'];

let historyId = 1;
/** One paid month ending at `end`. */
function historyInvoice(vendorId: string, end: Date, planId: Invoice['planId'], kind: Invoice['kind'], fromPlanId: Invoice['planId']): Invoice {
  const start = startOfDay(subMonths(end, 1));
  const paidAt = new Date(start.getTime() - 2 * 86_400_000).toISOString();
  const amount = PRICES[planId];
  const n = historyId++;
  const id = `INV-H${String(n).padStart(4, '0')}`;
  return {
    id,
    vendorId,
    associationId: null,
    memberIds: [],
    kind,
    planId,
    fromPlanId,
    amount,
    lines: [{ label: `${PLAN_NAMES[planId]}, 1 month`, amount }],
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    effectiveAt: start.toISOString(),
    status: INVOICE_STATUS.Paid,
    createdAt: paidAt,
    paidAt,
    paymentReference: `GW-SUB-${id.slice(4)}`,
    method: METHODS[n % METHODS.length]
  };
}

/** Consecutive monthly invoices, the last one ending at `lastEnd`, oldest first. */
function monthlyHistory(vendorId: string, lastEnd: Date, months: number, planFor: (monthsAgo: number) => Invoice['planId']): Invoice[] {
  const agoList = Array.from({ length: Math.max(0, months) }, (_, i) => months - 1 - i);
  return agoList.map((monthsAgo, i) => {
    const planId = planFor(monthsAgo);
    const previous = i > 0 ? planFor(agoList[i - 1]) : planId;
    const kind =
    i === 0 ? INVOICE_KIND.Subscribe : planId === previous ? INVOICE_KIND.Renew : PRICES[planId] > PRICES[previous] ? INVOICE_KIND.Upgrade : INVOICE_KIND.Downgrade;
    return historyInvoice(vendorId, endOfDay(subMonths(lastEnd, monthsAgo)), planId, kind, previous);
  });
}

export const mockDirectorySubscriptions: Subscription[] = DIRECTORY.map((d) => ({
  vendorId: d.vendorId,
  planId: d.planId,
  periodStart: startOfDay(subMonths(new Date(endIn(d.endsInDays)), 1)).toISOString(),
  renewsOn: endIn(d.endsInDays),
  startedAt: startOfDay(subMonths(new Date(endIn(d.endsInDays)), d.months)).toISOString(),
  scheduledChange: null,
  coveredBy: null
}));

const directoryInvoices = DIRECTORY.flatMap((d) => {
  const lastEnd = new Date(endIn(d.endsInDays));
  const history = monthlyHistory(d.vendorId, lastEnd, d.months, (ago) => d.change && ago >= d.change.monthsAgo ? d.change.from : d.planId);
  if (!d.gap?.length) return history;
  // Drop the gap months; the first payment after a gap is a fresh sign-up.
  const skipped = new Set(d.gap.map((ago) => endOfDay(subMonths(lastEnd, ago)).toISOString()));
  const afterGap = new Set(d.gap.map((ago) => endOfDay(subMonths(lastEnd, ago - 1)).toISOString()));
  return history.
  filter((inv) => !skipped.has(inv.periodEnd)).
  map((inv) => afterGap.has(inv.periodEnd) && !skipped.has(inv.periodEnd) ? { ...inv, kind: INVOICE_KIND.Subscribe } : inv);
});

/**
 * The association's bundle: one invoice a month for the members covered at the start of that period, with
 * the bundle discount (the same rules as live bundle billing).
 */
const bundleInvoices: Invoice[] = [2, 1, 0].map((monthsAgo) => {
  const association = mockAssociations[0];
  const end = endOfDay(subMonths(new Date(association.renewsOn), monthsAgo));
  const start = startOfDay(subMonths(end, 1));
  const members = association.members.filter((m) => m.coveredFrom && new Date(m.coveredFrom).getTime() <= start.getTime() + 2 * 86_400_000);
  const quote = quoteBundle(members.map((m) => m.vendorName), PRICES.standard, PLAN_NAMES.standard);
  const paidAt = new Date(start.getTime() - 86_400_000).toISOString();
  const id = `INV-B${String(3 - monthsAgo).padStart(3, '0')}`;
  return {
    id,
    vendorId: association.id,
    associationId: association.id,
    memberIds: members.map((m) => m.id),
    kind: INVOICE_KIND.BundleRenewal,
    planId: PLAN_ID.Standard,
    fromPlanId: PLAN_ID.Standard,
    amount: quote.total,
    lines: quote.lines,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    effectiveAt: start.toISOString(),
    status: INVOICE_STATUS.Paid,
    createdAt: paidAt,
    paidAt,
    paymentReference: `GW-SUB-${id.slice(4)}`,
    method: 'transfer'
  };
});

/**
 * Association members paid for themselves until the bundle covered them: their own history ends the day
 * their first bundle period starts, so there's no gap in their cover.
 */
const memberInvoices = [
{ vendorId: 'yusuf-borehole', planId: PLAN_ID.Standard, months: 11 },
{ vendorId: 'musa-auto-clinic', planId: PLAN_ID.Standard, months: 13 },
{ vendorId: 'danladi-carpentry', planId: PLAN_ID.Starter, months: 7 },
{ vendorId: 'emeka-paints', planId: PLAN_ID.Starter, months: 4 },
{ vendorId: 'grace-hair-beauty', planId: PLAN_ID.Starter, months: 9 }].
flatMap((m) => {
  const memberId = mockAssociations[0].members.find((x) => x.vendorId === m.vendorId)?.id;
  const firstBundle = bundleInvoices.find((b) => memberId && b.memberIds.includes(memberId));
  return firstBundle ? monthlyHistory(m.vendorId, endOfDay(new Date(firstBundle.periodStart)), m.months, () => m.planId) : [];
});

/** Vendors who closed their accounts paid until the month they left, then never renewed. */
const formerInvoices = formerVendors.flatMap((f) =>
monthlyHistory(f.id, endOfDay(subMonths(new Date(), f.leftMonthsAgo)), f.joinedMonthsAgo - f.leftMonthsAgo, () => f.planId)
);

/** Every past subscription payment on the platform besides the demo vendor's (those are mockInvoices). */
export const mockHistoryInvoices: Invoice[] = [...directoryInvoices, ...memberInvoices, ...bundleInvoices, ...formerInvoices];
