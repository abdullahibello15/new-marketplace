import { formerVendors } from '../../../data/formerVendors';
import { findTradeCategory } from '../../../data/tradeCategories';
import { getAllVendors } from '../../../services/vendorStore';
import { JOB_STATUS } from '../../jobs/constants';
import { jobsSnapshot } from '../../jobs/services/jobService';
import { reachedAt } from '../../jobs/stateMachine';
import { ORDER_STATUS } from '../../orders/constants';
import { ordersSnapshot } from '../../orders/services/orderService';
import { orderReachedAt } from '../../orders/stateMachine';
import { ESCROW_CONFIG } from '../../payments/escrow/escrowConfig';
import { ESCROW_EVENT, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_SUBJECT } from '../../payments/constants';
import { escrowsSnapshot } from '../../payments/services/escrowService';
import { paymentsSnapshot } from '../../payments/services/paymentService';
import { allAssociations } from '../../vendor-dashboard/services/associationService';
import { invoicesSnapshot, subscriptionsSnapshot, vendorStanding } from '../../vendor-dashboard/services/subscriptionService';
import { planById } from '../../vendor-dashboard/plans';
import { INVOICE_STATUS } from '../../vendor-dashboard/constants';
import { blockedDatesSnapshot } from '../../vendor-dashboard/services/scheduleService';
import { JOB_ACTOR, RESCHEDULE_STATUS } from '../../jobs/constants';
import { ORDER_ACTOR } from '../../orders/constants';
import { SLA_TYPE } from '../analytics/slaConfig';
import { businessMinutesBetween, typicalResponseMinutes, type VendorSchedule } from '../analytics/sla';
import { mockChurnReasons } from '../mock/churnReasons';
import { DEFAULT_HOURS, buildArchive, joinDates, type Archive } from '../mock/analyticsHistory';
import { disputeSummariesNow } from './disputeService';
import type { NigerLga, WorkingHours } from '../../../types/marketplace';
import type { AnalyticsFacts, BusinessKind, CommissionFact, CoverageFact, ResponseFact, RevenueFact, VendorFact, WorkFact } from '../analytics/types';

/*
 * Turns the platform's records into analytics facts: the live stores (vendors, jobs, orders, payments,
 * escrow, subscriptions and invoices, associations) plus the history archive. No figures are worked out
 * here; that's the aggregation helpers' job.
 */

const kindOf = (category: string): BusinessKind => findTradeCategory(category)?.kind === 'retail' ? 'retail' : 'service';
const baseLga = (lga: string) => lga.replace(/ LGA$/, '') as NigerLga;

/** The archive is generated once per session (it's large and only depends on the day). */
let archive: Archive | null = null;
/** The signed-in demo vendor, whose blocked days live in the vendor schedule store. */
const SCHEDULE_OWNER = 'bala-plumbing';

function vendorFacts(): VendorFact[] {
  const joined = joinDates();
  const now = new Date().toISOString();
  const current = getAllVendors().map((v): VendorFact => ({
    id: v.id,
    name: v.name,
    kind: kindOf(v.tradeCategory),
    category: v.tradeCategory,
    serviceAreas: v.serviceAreas.length ? v.serviceAreas : [baseLga(v.lga)],
    verification: v.verification,
    joinedAt: joined.get(v.id) ?? now,
    leftAt: null,
    current: true
  }));
  const former = formerVendors.map((f): VendorFact => ({
    id: f.id,
    name: f.name,
    kind: kindOf(f.tradeCategory),
    category: f.tradeCategory,
    serviceAreas: f.serviceAreas,
    verification: 'id',
    joinedAt: joined.get(f.id) ?? now,
    leftAt: new Date(Date.now() - f.leftMonthsAgo * 30.4 * 86_400_000).toISOString(),
    current: false
  }));
  return [...current, ...former];
}

/** How each job or order was paid: escrow for online payments, cash otherwise (null if unpaid). */
function paidVia(kind: 'job' | 'order', id: string): WorkFact['paidVia'] {
  const p = paymentsSnapshot().find((x) => x.subject.kind === kind && x.subject.id === id && (x.status === PAYMENT_STATUS.Paid || x.status === PAYMENT_STATUS.Refunded));
  if (!p) return null;
  return p.method === PAYMENT_METHOD.Cash ? 'cash' : 'escrow';
}

function liveWork(): WorkFact[] {
  const vendors = new Map(getAllVendors().map((v) => [v.id, v]));
  const jobs = jobsSnapshot().map((j): WorkFact => {
    const vendor = vendors.get(j.vendorId);
    const completed = reachedAt(j, JOB_STATUS.Completed);
    return {
      id: `job-${j.id}`,
      kind: 'service',
      vendorId: j.vendorId,
      category: vendor?.tradeCategory ?? 'other',
      lga: j.address.lga,
      requestedAt: j.createdAt,
      quotedAt: reachedAt(j, JOB_STATUS.Quoted),
      acceptedAt: reachedAt(j, JOB_STATUS.Scheduled),
      completedAt: completed,
      cancelledAt: reachedAt(j, JOB_STATUS.Cancelled),
      disputedAt: reachedAt(j, JOB_STATUS.Disputed),
      value: j.agreedPrice ?? j.quote?.amount ?? 0,
      paidVia: paidVia('job', j.id)
    };
  });
  const orders = ordersSnapshot().map((o): WorkFact => {
    const vendor = vendors.get(o.vendorId);
    return {
      id: `order-${o.id}`,
      kind: 'retail',
      vendorId: o.vendorId,
      category: vendor?.tradeCategory ?? 'grocer',
      lga: o.delivery?.lga ?? (vendor ? baseLga(vendor.lga) : 'Chanchaga'),
      requestedAt: o.createdAt,
      quotedAt: null,
      acceptedAt: orderReachedAt(o, ORDER_STATUS.Confirmed),
      completedAt: orderReachedAt(o, ORDER_STATUS.Completed),
      cancelledAt: orderReachedAt(o, ORDER_STATUS.Cancelled),
      disputedAt: orderReachedAt(o, ORDER_STATUS.Disputed),
      value: o.total,
      paidVia: paidVia('order', o.id)
    };
  });
  return [...jobs, ...orders];
}

/** Commission taken on escrow releases: live escrow ledgers, plus the archive's online-paid completed work. */
function commissionFacts(archived: readonly WorkFact[]): CommissionFact[] {
  const live = escrowsSnapshot().flatMap((e) => e.subject.kind === PAYMENT_SUBJECT.Subscription ? [] : e.ledger.filter((l) => l.type === ESCROW_EVENT.Released && l.commission > 0).map((l) => ({ at: l.at, amount: l.commission })));
  const past = archived.filter((w) => w.completedAt && w.paidVia === 'escrow').map((w) => ({ at: w.completedAt as string, amount: Math.round(w.value * ESCROW_CONFIG.commissionRate) }));
  return [...live, ...past];
}

/**
 * Subscription cover and revenue from the invoices: each paid vendor invoice covers that vendor; each
 * bundle invoice covers its members (at their share) and counts once as "bundle" revenue. The live
 * subscription records add each vendor's current period (e.g. after the demo moves dates).
 */
function subscriptionFacts(): {coverage: CoverageFact[];revenue: RevenueFact[];} {
  const paid = invoicesSnapshot().filter((i) => i.status === INVOICE_STATUS.Paid && i.paidAt);
  const memberVendor = new Map(allAssociations().flatMap((a) => a.members.map((m) => [m.id, m.vendorId] as const)));
  const coverage: CoverageFact[] = [];
  const revenue: RevenueFact[] = [];

  for (const inv of paid) {
    if (inv.associationId) {
      const share = inv.memberIds.length ? Math.round(inv.amount / inv.memberIds.length) : 0;
      for (const memberId of inv.memberIds) {
        const vendorId = memberVendor.get(memberId);
        if (vendorId) coverage.push({ vendorId, start: inv.periodStart, end: inv.periodEnd, monthlyValue: share, planId: inv.planId, viaBundle: true });
      }
      revenue.push({ id: inv.id, payerId: inv.associationId, paidAt: inv.paidAt as string, amount: inv.amount, line: 'bundle', kind: inv.kind });
    } else {
      coverage.push({ vendorId: inv.vendorId, start: inv.periodStart, end: inv.periodEnd, monthlyValue: planById(inv.planId).price, planId: inv.planId, viaBundle: false });
      revenue.push({ id: inv.id, payerId: inv.vendorId, paidAt: inv.paidAt as string, amount: inv.amount, line: inv.planId, kind: inv.kind });
    }
  }

  // The live record's current period, unless an invoice already covers the same end date.
  for (const sub of subscriptionsSnapshot()) {
    if (sub.coveredBy && !sub.coveredBy.removed) continue;
    const endDay = sub.renewsOn.slice(0, 10);
    if (coverage.some((c) => c.vendorId === sub.vendorId && c.end.slice(0, 10) === endDay)) continue;
    coverage.push({ vendorId: sub.vendorId, start: sub.periodStart, end: sub.renewsOn, monthlyValue: planById(sub.planId).price, planId: sub.planId, viaBundle: false });
  }
  return { coverage, revenue };
}

/**
 * Response events from the live stores: the vendor's first reply to a job request (quote or decline) or an
 * order (confirm, decline or out of stock), the quote itself, replies to customers' reschedule requests,
 * and the vendor's response to a dispute case. Requests withdrawn before the vendor replied are left out.
 */
function liveResponses(): ResponseFact[] {
  const vendors = new Map(getAllVendors().map((v) => [v.id, v]));
  const categoryOf = (vendorId: string) => vendors.get(vendorId)?.tradeCategory ?? 'other';
  const out: ResponseFact[] = [];

  for (const j of jobsSnapshot()) {
    const firstVendor = j.history.find((h) => h.by === JOB_ACTOR.Vendor && (h.status === JOB_STATUS.Quoted || h.status === JOB_STATUS.Declined));
    if (!firstVendor && j.status !== JOB_STATUS.Requested) continue;
    const base = { vendorId: j.vendorId, label: `Job #${j.id}${j.serviceName ? ` · ${j.serviceName}` : ''}`, category: categoryOf(j.vendorId), lga: j.address.lga, requestedAt: j.createdAt };
    out.push({ ...base, id: `job-${j.id}-first`, type: SLA_TYPE.FirstResponse, respondedAt: firstVendor?.at ?? null });
    if (firstVendor?.status !== JOB_STATUS.Declined) out.push({ ...base, id: `job-${j.id}-quote`, type: SLA_TYPE.Quote, respondedAt: reachedAt(j, JOB_STATUS.Quoted) });
    for (const r of j.reschedules) {
      if (r.requestedBy !== JOB_ACTOR.Customer) continue;
      out.push({ ...base, id: `job-${j.id}-${r.id}`, type: SLA_TYPE.RescheduleResponse, requestedAt: r.createdAt, respondedAt: r.status === RESCHEDULE_STATUS.Pending ? null : r.respondedAt });
    }
  }

  for (const o of ordersSnapshot()) {
    const firstVendor = o.history.find((h) => h.by === ORDER_ACTOR.Vendor && h.status !== ORDER_STATUS.Placed);
    if (!firstVendor && o.status !== ORDER_STATUS.Placed) continue;
    const vendor = vendors.get(o.vendorId);
    const base = {
      vendorId: o.vendorId,
      label: `Order #${o.id}`,
      category: vendor?.tradeCategory ?? 'grocer',
      lga: o.delivery?.lga ?? (vendor ? baseLga(vendor.lga) : 'Chanchaga'),
      requestedAt: o.createdAt,
      respondedAt: firstVendor?.at ?? null
    };
    out.push({ ...base, id: `order-${o.id}-first`, type: SLA_TYPE.FirstResponse });
    out.push({ ...base, id: `order-${o.id}-confirm`, type: SLA_TYPE.OrderConfirm });
  }

  const jobs = new Map(jobsSnapshot().map((j) => [j.id, j]));
  const orders = new Map(ordersSnapshot().map((o) => [o.id, o]));
  for (const d of disputeSummariesNow()) {
    const due = d.deadlines.vendor;
    if (!due) continue;
    const vendor = vendors.get(d.vendorId);
    const lga = (d.subject.kind === 'job' ? jobs.get(d.subject.id)?.address.lga : orders.get(d.subject.id)?.delivery?.lga) ?? (vendor ? baseLga(vendor.lga) : 'Chanchaga');
    out.push({ id: `dispute-${d.id}`, vendorId: d.vendorId, type: SLA_TYPE.DisputeResponse, label: d.title, category: categoryOf(d.vendorId), lga, requestedAt: due.requestedAt, respondedAt: due.respondedAt });
  }
  return out;
}

function workingHoursFacts(): Map<string, WorkingHours> {
  const map = new Map<string, WorkingHours>(formerVendors.map((f) => [f.id, DEFAULT_HOURS]));
  for (const v of getAllVendors()) map.set(v.id, v.workingHours);
  return map;
}

/** Archive days off, plus the demo vendor's real blocked days from their schedule. */
function blockedDayFacts(fromArchive: Map<string, Set<string>>): Map<string, Set<string>> {
  const map = new Map([...fromArchive].map(([id, days]) => [id, new Set(days)]));
  const own = map.get(SCHEDULE_OWNER) ?? new Set<string>();
  blockedDatesSnapshot().forEach((d) => own.add(d));
  map.set(SCHEDULE_OWNER, own);
  return map;
}

/** The SLA clock for one vendor: their working hours and blocked days. */
export function scheduleFor(facts: Pick<AnalyticsFacts, 'workingHours' | 'blockedDays'>, vendorId: string): VendorSchedule {
  return { workingHours: facts.workingHours.get(vendorId) ?? DEFAULT_HOURS, blockedDates: facts.blockedDays.get(vendorId) ?? new Set() };
}

/** Everything the analytics dashboard calculates from, right now. */
export function collectFacts(): AnalyticsFacts {
  archive ??= buildArchive();
  const vendors = vendorFacts();
  const { coverage, revenue } = subscriptionFacts();
  return {
    vendors,
    work: [...archive.work, ...liveWork()],
    responses: [...archive.responses, ...liveResponses()],
    workingHours: workingHoursFacts(),
    blockedDays: blockedDayFacts(archive.blockedDays),
    churnReasons: structuredClone(mockChurnReasons),
    commission: commissionFacts(archive.work),
    coverage,
    revenue,
    suspendedByAdmin: vendors.filter((v) => v.current && vendorStanding(v.id).adminSuspension).map((v) => v.id),
    generatedAt: new Date().toISOString()
  };
}

/**
 * A vendor's typical (median) first-response time in working minutes over the recent window, or null
 * without enough replies. The public "Usually responds within…" line reads this, so it uses the same SLA
 * helper and working-hours clock as the admin SLA dashboard.
 */
export function vendorTypicalResponseMinutes(vendorId: string, now = new Date()): number | null {
  archive ??= buildArchive();
  const own = [...archive.responses, ...liveResponses()].filter((r) => r.vendorId === vendorId && r.type === SLA_TYPE.FirstResponse);
  if (own.length === 0) return null;
  const schedule = scheduleFor({ workingHours: workingHoursFacts(), blockedDays: blockedDayFacts(archive.blockedDays) }, vendorId);
  return typicalResponseMinutes(own.map((r) => ({
    requestedAt: new Date(r.requestedAt),
    responseMinutes: r.respondedAt ? businessMinutesBetween(new Date(r.requestedAt), new Date(r.respondedAt), schedule) : null
  })), now);
}
