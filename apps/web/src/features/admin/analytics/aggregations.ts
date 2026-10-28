import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths } from
'date-fns';
import { fromDateKey } from '../../../lib/dates';
import { SUBSCRIPTION_STATUS } from '../../vendor-dashboard/constants';
import { getSubscriptionStatus, graceEndsAt } from '../../vendor-dashboard/utils/subscription';
import { ACTIVE_VENDOR_RULE, BUCKET_RULES } from './config';
import type { NigerLga, TradeCategory } from '../../../types/marketplace';
import type { PlanId } from '../../vendor-dashboard/types';
import type {
  BucketSize,
  CommissionFact,
  Comparable,
  CoverageFact,
  DateRange,
  RangePreset,
  RevenueFact,
  SubscriberStatus,
  TimeBucket,
  VendorFact,
  WorkFact } from
'./types';

/*
 * THE analytics aggregation helpers: every number on the admin analytics dashboard is calculated here
 * from facts (vendors, jobs and orders, subscription cover and payments, escrow commission). Pure: no
 * clock reads (callers pass `now`), no I/O. Tested in aggregations.test.ts. Amounts are whole Naira.
 */

const t = (iso: string | Date) => typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => whole > 0 ? round1(part / whole * 100) : 0;
const sum = (values: number[]) => values.reduce((s, n) => s + n, 0);

/* ---------- Ranges and buckets ---------- */

const PRESET_DAYS: Partial<Record<RangePreset, number>> = { '7d': 7, '30d': 30, '90d': 90 };

/** The range for a preset, ending today. Custom ranges are clamped to today; a bad custom range falls back to 30 days. */
export function resolveRange(preset: RangePreset, from: string, to: string, now: Date): DateRange {
  const end = endOfDay(now);
  if (preset === 'custom' && from && to) {
    const start = startOfDay(fromDateKey(from));
    const until = endOfDay(fromDateKey(to));
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(until.getTime()) && start <= until) return { start, end: until > end ? end : until };
  }
  if (preset === '12m') return { start: startOfDay(addDays(subMonths(now, 12), 1)), end };
  const days = PRESET_DAYS[preset] ?? 30;
  return { start: startOfDay(subDays(now, days - 1)), end };
}

/** The period of the same length just before `range` (for "vs previous period"). */
export function previousRange(range: DateRange): DateRange {
  const length = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  return { start: new Date(end.getTime() - length), end };
}

export const within = (iso: string | null, range: DateRange) => iso !== null && t(iso) >= range.start.getTime() && t(iso) <= range.end.getTime();

/** Daily up to a month, weekly up to ~4 months, monthly beyond (see BUCKET_RULES). */
export function bucketSizeFor(range: DateRange): BucketSize {
  const days = differenceInCalendarDays(range.end, range.start) + 1;
  if (days <= BUCKET_RULES.dailyUpToDays) return 'day';
  return days <= BUCKET_RULES.weeklyUpToDays ? 'week' : 'month';
}

/** The chart buckets covering the range, clipped to it. Weeks start on Monday. */
export function bucketsFor(range: DateRange, size: BucketSize = bucketSizeFor(range)): TimeBucket[] {
  const startOf = size === 'day' ? startOfDay : size === 'week' ? (d: Date) => startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth;
  const endOf = size === 'day' ? endOfDay : size === 'week' ? (d: Date) => endOfWeek(d, { weekStartsOn: 1 }) : endOfMonth;
  const next = size === 'day' ? (d: Date) => addDays(d, 1) : size === 'week' ? (d: Date) => addWeeks(d, 1) : (d: Date) => addMonths(d, 1);
  const buckets: TimeBucket[] = [];
  for (let cursor = startOf(range.start); cursor <= range.end; cursor = next(cursor)) {
    const start = cursor < range.start ? range.start : cursor;
    const end = endOf(cursor) > range.end ? range.end : endOf(cursor);
    buckets.push({
      key: format(cursor, size === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'),
      label: format(cursor, size === 'month' ? 'MMM yy' : 'd MMM'),
      start,
      end
    });
  }
  return buckets;
}

/** % change, 1 decimal; null when the previous value is 0 (or missing) and the change can't be expressed. */
export function changePct(value: number, previous: number | null): number | null {
  if (previous === null) return null;
  if (previous === 0) return value === 0 ? 0 : null;
  return round1((value - previous) / Math.abs(previous) * 100);
}

export const comparable = (value: number, previous: number | null): Comparable => ({ value, previous, change: changePct(value, previous) });

/* ---------- GMV-equivalent ---------- */

/**
 * THE GMV-equivalent of one job or order (see GMV_DEFINITION in config.ts): its accepted value — the
 * agreed quote for a job, the order total for retail — once it's completed; 0 otherwise. Counted on the
 * completion date. Every GMV figure on the dashboard is a sum of this.
 */
export function gmvValue(fact: Pick<WorkFact, 'completedAt' | 'value'>): number {
  return fact.completedAt ? Math.max(0, fact.value) : 0;
}

export const completedIn = (work: readonly WorkFact[], range: DateRange) => work.filter((w) => within(w.completedAt, range));

export function gmvSummary(work: readonly WorkFact[], range: DateRange) {
  const done = completedIn(work, range);
  const gmv = sum(done.map(gmvValue));
  return {
    gmv,
    jobs: done.filter((w) => w.kind === 'service').length,
    orders: done.filter((w) => w.kind === 'retail').length,
    average: done.length ? Math.round(gmv / done.length) : 0
  };
}

/** GMV per bucket, split by services and retail. */
export function gmvSeries(work: readonly WorkFact[], buckets: readonly TimeBucket[]) {
  return buckets.map((b) => {
    const done = completedIn(work, b);
    const service = sum(done.filter((w) => w.kind === 'service').map(gmvValue));
    const retail = sum(done.filter((w) => w.kind === 'retail').map(gmvValue));
    return { key: b.key, label: b.label, service, retail, total: service + retail };
  });
}

/** GMV and count grouped by any key (category, LGA, vendor), largest first. */
export function gmvBy(work: readonly WorkFact[], range: DateRange, keyOf: (w: WorkFact) => string) {
  const groups = new Map<string, {key: string;gmv: number;count: number;}>();
  for (const w of completedIn(work, range)) {
    const key = keyOf(w);
    const g = groups.get(key) ?? { key, gmv: 0, count: 0 };
    groups.set(key, { key, gmv: g.gmv + gmvValue(w), count: g.count + 1 });
  }
  return [...groups.values()].sort((a, b) => b.gmv - a.gmv || a.key.localeCompare(b.key));
}

/** Service requests made in the period, and how far each got (a cohort, so drop-offs are honest). */
export function funnel(work: readonly WorkFact[], range: DateRange) {
  const cohort = work.filter((w) => w.kind === 'service' && within(w.requestedAt, range));
  const counts = [
  { id: 'requests', label: 'Requests', count: cohort.length },
  { id: 'quotes', label: 'Quotes', count: cohort.filter((w) => w.quotedAt).length },
  { id: 'accepted', label: 'Accepted', count: cohort.filter((w) => w.acceptedAt).length },
  { id: 'completed', label: 'Completed', count: cohort.filter((w) => w.completedAt).length }];

  return counts.map((step, i) => ({
    ...step,
    /** % of the previous step lost at this step (0 for the first). */
    dropOff: i === 0 ? 0 : counts[i - 1].count > 0 ? round1(100 - step.count / counts[i - 1].count * 100) : 0,
    /** % of all requests that reached this step. */
    ofRequests: pct(step.count, counts[0].count)
  }));
}

/** Cancellation and dispute rates, and how GMV was paid (see RATE_DEFINITIONS). */
export function workRates(work: readonly WorkFact[], range: DateRange) {
  const accepted = work.filter((w) => within(w.acceptedAt, range)).length;
  const cancelled = work.filter((w) => within(w.cancelledAt, range)).length;
  const disputed = work.filter((w) => within(w.disputedAt, range)).length;
  const done = completedIn(work, range);
  const gmv = sum(done.map(gmvValue));
  const escrow = sum(done.filter((w) => w.paidVia === 'escrow').map(gmvValue));
  const cash = sum(done.filter((w) => w.paidVia === 'cash').map(gmvValue));
  return {
    accepted,
    cancelled,
    disputed,
    completed: done.length,
    cancellationRate: pct(cancelled, accepted),
    disputeRate: pct(disputed, done.length + disputed),
    escrowShare: pct(escrow, gmv),
    cashShare: pct(cash, gmv),
    escrowGmv: escrow,
    cashGmv: cash,
    /** Completed before payment was recorded (e.g. unpaid cash). */
    unpaidGmv: gmv - escrow - cash
  };
}

/* ---------- Subscription status from cover ---------- */

/** Each vendor's cover, oldest first. */
export function coverByVendor(coverage: readonly CoverageFact[]): Map<string, CoverageFact[]> {
  const map = new Map<string, CoverageFact[]>();
  for (const c of coverage) map.set(c.vendorId, [...map.get(c.vendorId) ?? [], c]);
  for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  return map;
}

/** The cover in force (or most recently ended) at `at`: started by then, ending last. */
export function currentCover(cover: readonly CoverageFact[], at: Date): CoverageFact | null {
  return cover.filter((c) => t(c.start) <= at.getTime()).reduce<CoverageFact | null>((best, c) => !best || c.end > best.end ? c : best, null);
}

/**
 * A vendor's subscription status at a moment, from their paid cover, using the app's ONE status helper
 * (getSubscriptionStatus): Active, Expiring soon, Grace or Suspended; 'none' before they ever subscribed.
 */
export function statusAt(cover: readonly CoverageFact[], at: Date): SubscriberStatus {
  const c = currentCover(cover, at);
  return c ? getSubscriptionStatus(c.end, at) : 'none';
}

const PAYING: readonly SubscriberStatus[] = [SUBSCRIPTION_STATUS.Active, SUBSCRIPTION_STATUS.ExpiringSoon, SUBSCRIPTION_STATUS.Grace];
export const isSubscribed = (status: SubscriberStatus) => PAYING.includes(status);

/** Admin suspensions are only known for now, so they apply to moments within the last day. */
const adminSuspendedAt = (vendorId: string, at: Date, suspendedByAdmin: readonly string[], now: Date) =>
suspendedByAdmin.includes(vendorId) && at.getTime() >= now.getTime() - 86_400_000;

/* ---------- Vendors ---------- */

/** Vendors who count as active in the period (see ACTIVE_VENDOR_RULE). */
export function activeVendorIds(
vendors: readonly VendorFact[],
work: readonly WorkFact[],
cover: Map<string, CoverageFact[]>,
range: DateRange,
suspendedByAdmin: readonly string[],
now: Date,
rule: {minCompletedInPeriod: number;excludeSuspended: boolean;} = ACTIVE_VENDOR_RULE)
: Set<string> {
  const completed = new Map<string, number>();
  for (const w of completedIn(work, range)) completed.set(w.vendorId, (completed.get(w.vendorId) ?? 0) + 1);
  return new Set(
    vendors.
    filter((v) => (completed.get(v.id) ?? 0) >= rule.minCompletedInPeriod).
    filter((v) => {
      if (!rule.excludeSuspended) return true;
      if (adminSuspendedAt(v.id, range.end, suspendedByAdmin, now)) return false;
      return isSubscribed(statusAt(cover.get(v.id) ?? [], range.end));
    }).
    map((v) => v.id)
  );
}

/** On the platform at the end of the range: joined by then and not yet left. */
const onPlatform = (v: VendorFact, at: Date) => t(v.joinedAt) <= at.getTime() && (!v.leftAt || t(v.leftAt) > at.getTime());

export function vendorSummary(
vendors: readonly VendorFact[],
active: Set<string>,
cover: Map<string, CoverageFact[]>,
range: DateRange,
suspendedByAdmin: readonly string[],
now: Date)
{
  const activeVendors = vendors.filter((v) => active.has(v.id));
  const suspended = vendors.filter(
    (v) => onPlatform(v, range.end) && (adminSuspendedAt(v.id, range.end, suspendedByAdmin, now) || statusAt(cover.get(v.id) ?? [], range.end) === SUBSCRIPTION_STATUS.Suspended)
  );
  return {
    active: activeVendors.length,
    newVendors: vendors.filter((v) => within(v.joinedAt, range)).length,
    suspended: suspended.length,
    verifiedShare: pct(activeVendors.filter((v) => v.verification !== 'unverified').length, activeVendors.length)
  };
}

/** Active vendors per trade category (every category listed, zeros included). */
export function activeByCategory(vendors: readonly VendorFact[], active: Set<string>, categories: readonly TradeCategory[]) {
  return categories.map((category) => ({ category, count: vendors.filter((v) => active.has(v.id) && v.category === category).length }));
}

/** Active vendors serving each LGA (a vendor serving three LGAs counts in each; zeros included). */
export function activeByLga(vendors: readonly VendorFact[], active: Set<string>, lgas: readonly NigerLga[]) {
  return lgas.map((lga) => ({ lga, count: vendors.filter((v) => active.has(v.id) && v.serviceAreas.includes(lga)).length }));
}

/** Category × LGA counts of active vendors, to spot gaps (zeros are gaps). */
export function categoryLgaMatrix(vendors: readonly VendorFact[], active: Set<string>, categories: readonly TradeCategory[], lgas: readonly NigerLga[]) {
  return categories.map((category) => ({
    category,
    cells: lgas.map((lga) => ({ lga, count: vendors.filter((v) => active.has(v.id) && v.category === category && v.serviceAreas.includes(lga)).length }))
  }));
}

/* ---------- Subscriptions ---------- */

/** Every subscriber's status and current cover at a moment. */
export function subscribersAt(cover: Map<string, CoverageFact[]>, at: Date, suspendedByAdmin: readonly string[], now: Date) {
  return [...cover.entries()].map(([vendorId, list]) => {
    const status: SubscriberStatus = adminSuspendedAt(vendorId, at, suspendedByAdmin, now) ? SUBSCRIPTION_STATUS.Suspended : statusAt(list, at);
    return { vendorId, status, cover: currentCover(list, at) };
  });
}

/** Monthly recurring revenue at a moment (see RATE_DEFINITIONS.mrr). */
export function mrrAt(cover: Map<string, CoverageFact[]>, at: Date, suspendedByAdmin: readonly string[], now: Date): number {
  return sum(subscribersAt(cover, at, suspendedByAdmin, now).filter((s) => isSubscribed(s.status)).map((s) => s.cover?.monthlyValue ?? 0));
}

export const activeSubscriberCount = (cover: Map<string, CoverageFact[]>, at: Date, suspendedByAdmin: readonly string[], now: Date) =>
subscribersAt(cover, at, suspendedByAdmin, now).filter((s) => isSubscribed(s.status)).length;

export const REVENUE_LINES = ['starter', 'standard', 'premium', 'bundle'] as const;
export type RevenueLine = (typeof REVENUE_LINES)[number];

export const revenueIn = (revenue: readonly RevenueFact[], range: DateRange) => sum(revenue.filter((r) => within(r.paidAt, range)).map((r) => r.amount));

export function revenueByLine(revenue: readonly RevenueFact[], range: DateRange): Record<RevenueLine, number> {
  const inRange = revenue.filter((r) => within(r.paidAt, range));
  return Object.fromEntries(REVENUE_LINES.map((line) => [line, sum(inRange.filter((r) => r.line === line).map((r) => r.amount))])) as Record<RevenueLine, number>;
}

/** Subscription revenue per bucket, stacked by plan and bundles. */
export function revenueSeries(revenue: readonly RevenueFact[], buckets: readonly TimeBucket[]) {
  return buckets.map((b) => ({ key: b.key, label: b.label, ...revenueByLine(revenue, b) }));
}

/** Churn over the period (see RATE_DEFINITIONS.churn). */
export function churn(cover: Map<string, CoverageFact[]>, range: DateRange, suspendedByAdmin: readonly string[], now: Date) {
  const atStart = subscribersAt(cover, range.start, suspendedByAdmin, now).filter((s) => isSubscribed(s.status)).map((s) => s.vendorId);
  const endStatus = new Map(subscribersAt(cover, range.end, suspendedByAdmin, now).map((s) => [s.vendorId, s.status]));
  const churned = atStart.filter((id) => !isSubscribed(endStatus.get(id) ?? 'none')).length;
  return { atStart: atStart.length, churned, rate: pct(churned, atStart.length) };
}

/** Subscribers by plan (bundle members under "bundle") at a moment. */
export function planMix(cover: Map<string, CoverageFact[]>, at: Date, suspendedByAdmin: readonly string[], now: Date): Record<PlanId | 'bundle', number> {
  const mix: Record<PlanId | 'bundle', number> = { starter: 0, standard: 0, premium: 0, bundle: 0 };
  for (const s of subscribersAt(cover, at, suspendedByAdmin, now)) {
    if (!isSubscribed(s.status) || !s.cover) continue;
    mix[s.cover.viaBundle ? 'bundle' : s.cover.planId] += 1;
  }
  return mix;
}

export function planChanges(revenue: readonly RevenueFact[], range: DateRange) {
  const inRange = revenue.filter((r) => within(r.paidAt, range));
  return { upgrades: inRange.filter((r) => r.kind === 'upgrade').length, downgrades: inRange.filter((r) => r.kind === 'downgrade').length };
}

/**
 * Lapses: a cover ended and no new cover started before its grace period ran out. Each lapse happens at
 * the end of that grace period (when the vendor became suspended). Only lapses already past `now` count.
 */
export function lapses(cover: Map<string, CoverageFact[]>, now: Date): {vendorId: string;at: Date;}[] {
  const out: {vendorId: string;at: Date;}[] = [];
  for (const [vendorId, list] of cover) {
    list.forEach((c) => {
      const graceEnd = graceEndsAt(c.end);
      if (graceEnd > now) return;
      const renewed = list.some((o) => o !== c && o.end > c.end && t(o.start) <= graceEnd.getTime());
      if (!renewed) out.push({ vendorId, at: graceEnd });
    });
  }
  return out;
}

/** New subscribers, renewing ones and lapsed ones in the period. */
export function subscriberMovements(cover: Map<string, CoverageFact[]>, range: DateRange, now: Date) {
  let newCount = 0;
  let renewing = 0;
  for (const list of cover.values()) {
    if (list.length && within(list[0].start, range)) newCount += 1;else
    if (list.slice(1).some((c) => within(c.start, range))) renewing += 1;
  }
  const lapsed = new Set(lapses(cover, now).filter((l) => within(l.at.toISOString(), range)).map((l) => l.vendorId)).size;
  return { newCount, renewing, lapsed };
}

/** Renewal rate (see RATE_DEFINITIONS.renewal); null when no period ended with its grace over. */
export function renewalRate(cover: Map<string, CoverageFact[]>, range: DateRange, now: Date) {
  let ended = 0;
  let renewed = 0;
  for (const list of cover.values()) {
    const seenEnds = new Set<string>();
    for (const c of list) {
      const graceEnd = graceEndsAt(c.end);
      if (!within(c.end, range) || graceEnd > now) continue;
      // Two covers ending the same day (e.g. a bundle share and the vendor's own plan) are one ending.
      const endDay = c.end.slice(0, 10);
      if (seenEnds.has(endDay)) continue;
      seenEnds.add(endDay);
      ended += 1;
      if (list.some((o) => o !== c && o.end > c.end && t(o.start) <= graceEnd.getTime())) renewed += 1;
    }
  }
  return { ended, renewed, rate: ended ? pct(renewed, ended) : null };
}

/**
 * Revenue at risk: current subscribers whose cover ends within `days` after `at` — including those already
 * past their end date and in the grace period, the most at risk of all — and what each pays a month.
 * Renewal is manual, so every one of them is at risk until they pay.
 */
export function expiringWithin(cover: Map<string, CoverageFact[]>, at: Date, days: number, suspendedByAdmin: readonly string[], now: Date) {
  const until = endOfDay(addDays(at, days)).getTime();
  return subscribersAt(cover, at, suspendedByAdmin, now).
  flatMap(({ vendorId, status, cover: c }) =>
  isSubscribed(status) && c && t(c.end) <= until ? [{ vendorId, status, endsOn: c.end, monthlyValue: c.monthlyValue, viaBundle: c.viaBundle }] : []
  ).
  sort((a, b) => a.endsOn.localeCompare(b.endsOn));
}

/** ESTIMATE of next month's subscription revenue (see RATE_DEFINITIONS.projection). */
export const projectNextMonth = (mrr: number, renewalRatePct: number | null) => Math.round(mrr * (renewalRatePct ?? 100) / 100);

/** Commission from escrow releases in the period. */
export const commissionIn = (commission: readonly CommissionFact[], range: DateRange) => sum(commission.filter((c) => within(c.at, range)).map((c) => c.amount));
