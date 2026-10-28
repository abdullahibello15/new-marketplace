import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { isSubscribed, lapses, statusAt, within } from './aggregations';
import { CHURN } from './config';
import type { CoverageFact, DateRange, TimeBucket, VendorFact, WorkFact } from './types';

/*
 * THE vendor churn helpers (definitions in config.ts → CHURN). Both kinds:
 *  - subscription churn: the grace period ran out with no new payment (the same lapse rule the
 *    subscription figures use, aggregations.lapses);
 *  - activity churn: CHURN.inactiveDays with no completed job or order.
 * A churned vendor who pays again (subscription) or completes work again (activity) is a win-back.
 * Pure: callers pass `now`. Tested in churn.test.ts.
 */

export type ChurnType = 'subscription' | 'activity';

export interface ChurnContext {
  vendors: readonly VendorFact[];
  cover: Map<string, CoverageFact[]>;
  work: readonly WorkFact[];
  now: Date;
  inactiveDays?: number;
}

export interface ChurnEvent {
  vendorId: string;
  /** When they counted as churned. */
  at: Date;
  /** When they came back, if they did. */
  returnedAt: Date | null;
}

const days = (ctx: ChurnContext) => ctx.inactiveDays ?? CHURN.inactiveDays;

/** Completion dates per vendor, oldest first. */
function completionsByVendor(work: readonly WorkFact[]): Map<string, Date[]> {
  const map = new Map<string, Date[]>();
  for (const w of work) if (w.completedAt) map.set(w.vendorId, [...map.get(w.vendorId) ?? [], new Date(w.completedAt)]);
  for (const list of map.values()) list.sort((a, b) => a.getTime() - b.getTime());
  return map;
}

/** Activity churn: each gap of `inactiveDays` after a completion (counted at the end of the gap). */
function activityEvents(ctx: ChurnContext): ChurnEvent[] {
  const out: ChurnEvent[] = [];
  for (const [vendorId, dates] of completionsByVendor(ctx.work)) {
    dates.forEach((d, i) => {
      const churnAt = addDays(d, days(ctx));
      const next = dates[i + 1] ?? null;
      if (churnAt > ctx.now) return;
      if (next && next <= churnAt) return;
      out.push({ vendorId, at: churnAt, returnedAt: next });
    });
  }
  return out;
}

/** Subscription churn: lapses (grace over, no renewal), and whether they paid again later. */
function subscriptionEvents(ctx: ChurnContext): ChurnEvent[] {
  return lapses(ctx.cover, ctx.now).map((l) => {
    const later = (ctx.cover.get(l.vendorId) ?? []).find((c) => new Date(c.start) > l.at);
    return { vendorId: l.vendorId, at: l.at, returnedAt: later ? new Date(later.start) : null };
  });
}

/**
 * Closing the account counts as churn under both definitions, at the moment they left (unless they'd
 * already churned and not come back). Nothing of theirs counts after that.
 */
function withClosures(events: ChurnEvent[], ctx: ChurnContext): ChurnEvent[] {
  const out = [...events];
  for (const v of ctx.vendors) {
    if (!v.leftAt || new Date(v.leftAt) > ctx.now) continue;
    const leftAt = new Date(v.leftAt);
    const own = out.filter((e) => e.vendorId === v.id);
    own.filter((e) => e.at >= leftAt).forEach((e) => out.splice(out.indexOf(e), 1));
    const before = own.filter((e) => e.at < leftAt);
    const last = before.at(-1);
    if (last?.returnedAt && last.returnedAt >= leftAt) last.returnedAt = null;
    if (!last || last.returnedAt) out.push({ vendorId: v.id, at: leftAt, returnedAt: null });
  }
  return out;
}

/** Every churn of this kind so far (closed accounts included), oldest first. */
export function churnEvents(type: ChurnType, ctx: ChurnContext): ChurnEvent[] {
  return withClosures(type === 'subscription' ? subscriptionEvents(ctx) : activityEvents(ctx), ctx).sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Counts as active (not churned) at a moment, by this kind's definition. */
export function isActiveAt(type: ChurnType, vendor: VendorFact, at: Date, ctx: ChurnContext, completions = completionsByVendor(ctx.work)): boolean {
  if (new Date(vendor.joinedAt) > at || vendor.leftAt && new Date(vendor.leftAt) <= at) return false;
  if (type === 'subscription') return isSubscribed(statusAt(ctx.cover.get(vendor.id) ?? [], at));
  const since = subDays(at, days(ctx));
  if (new Date(vendor.joinedAt) > since) return true;
  return (completions.get(vendor.id) ?? []).some((d) => d > since && d <= at);
}

/** Churn over a period: vendors active at its start who churned during it. */
export function churnSummary(type: ChurnType, ctx: ChurnContext, range: DateRange, events = churnEvents(type, ctx)) {
  const completions = completionsByVendor(ctx.work);
  const atStart = ctx.vendors.filter((v) => isActiveAt(type, v, range.start, ctx, completions));
  const startIds = new Set(atStart.map((v) => v.id));
  const churnedIds = new Set(events.filter((e) => startIds.has(e.vendorId) && within(e.at.toISOString(), range)).map((e) => e.vendorId));
  return {
    atStart: atStart.length,
    churned: churnedIds.size,
    retained: atStart.length - churnedIds.size,
    rate: atStart.length ? Math.round(churnedIds.size / atStart.length * 1000) / 10 : 0,
    churnedIds: [...churnedIds]
  };
}

/** Churn rate per bucket (each bucket measured on its own). */
export function churnSeries(type: ChurnType, ctx: ChurnContext, buckets: readonly TimeBucket[]) {
  const events = churnEvents(type, ctx);
  return buckets.map((b) => {
    const s = churnSummary(type, ctx, b, events);
    return { key: b.key, label: b.label, rate: s.rate, churned: s.churned, atStart: s.atStart };
  });
}

/** Win-backs: vendors who came back after churning, with the return in the period. */
export function winBacks(type: ChurnType, ctx: ChurnContext, range: DateRange, events = churnEvents(type, ctx)) {
  return events.
  filter((e) => e.returnedAt && within(e.returnedAt.toISOString(), range)).
  map((e) => ({ vendorId: e.vendorId, churnedAt: e.at, returnedAt: e.returnedAt as Date, daysAway: differenceInCalendarDays(e.returnedAt as Date, e.at) }));
}

/**
 * Average vendor lifetime in months: from joining to their last churn without a return (or leaving,
 * or now for vendors still active).
 */
export function averageLifetimeMonths(type: ChurnType, ctx: ChurnContext, events = churnEvents(type, ctx)): number {
  const live = ctx.vendors.filter((v) => new Date(v.joinedAt) <= ctx.now);
  if (live.length === 0) return 0;
  const total = live.reduce((sum, v) => {
    const final = events.filter((e) => e.vendorId === v.id && !e.returnedAt).pop();
    const end = final?.at ?? (v.leftAt && new Date(v.leftAt) < ctx.now ? new Date(v.leftAt) : ctx.now);
    return sum + Math.max(0, differenceInCalendarDays(end, new Date(v.joinedAt))) / 30.44;
  }, 0);
  return Math.round(total / live.length * 10) / 10;
}

/**
 * Cohort retention: vendors grouped by the month they joined, and the share still active (this kind's
 * definition) at the end of each following month. Future months are null.
 */
export function cohortRetention(type: ChurnType, ctx: ChurnContext, months: number = CHURN.cohortMonths) {
  const completions = completionsByVendor(ctx.work);
  const first = startOfMonth(addMonths(ctx.now, -(months - 1)));
  return Array.from({ length: months }, (_, i) => {
    const cohortStart = addMonths(first, i);
    const members = ctx.vendors.filter((v) => format(new Date(v.joinedAt), 'yyyy-MM') === format(cohortStart, 'yyyy-MM'));
    const cells = Array.from({ length: months - i }, (_, offset) => {
      const end = endOfMonth(addMonths(cohortStart, offset));
      const at = end > ctx.now ? ctx.now : end;
      if (members.length === 0) return { offset, share: null as number | null };
      const active = members.filter((v) => isActiveAt(type, v, at, ctx, completions)).length;
      return { offset, share: Math.round(active / members.length * 1000) / 10 };
    });
    return { cohort: format(cohortStart, 'yyyy-MM'), label: format(cohortStart, 'MMM yyyy'), size: members.length, cells };
  });
}

/** Churn rate for each group (plan, trade, LGA, tier, association…), largest rate first. */
export function churnBreakdown(type: ChurnType, ctx: ChurnContext, range: DateRange, groupOf: (vendor: VendorFact) => string, events = churnEvents(type, ctx)) {
  const completions = completionsByVendor(ctx.work);
  const churned = new Set(churnSummary(type, ctx, range, events).churnedIds);
  const groups = new Map<string, {group: string;atStart: number;churned: number;}>();
  for (const v of ctx.vendors) {
    if (!isActiveAt(type, v, range.start, ctx, completions)) continue;
    const key = groupOf(v);
    const g = groups.get(key) ?? { group: key, atStart: 0, churned: 0 };
    groups.set(key, { group: key, atStart: g.atStart + 1, churned: g.churned + (churned.has(v.id) ? 1 : 0) });
  }
  return [...groups.values()].
  map((g) => ({ ...g, rate: g.atStart ? Math.round(g.churned / g.atStart * 1000) / 10 : 0 })).
  sort((a, b) => b.rate - a.rate || b.atStart - a.atStart || a.group.localeCompare(b.group));
}

/* ---------- At risk of churning ---------- */

/** Completions in the last window vs the window before; "falling" per CHURN.risk. */
export function activityTrend(vendorId: string, work: readonly WorkFact[], now: Date, risk: Pick<typeof CHURN.risk, 'activityWindowDays' | 'activityDropShare' | 'activityMinBefore'> = CHURN.risk) {
  const recentStart = subDays(now, risk.activityWindowDays);
  const beforeStart = subDays(recentStart, risk.activityWindowDays);
  const done = work.filter((w) => w.vendorId === vendorId && w.completedAt).map((w) => new Date(w.completedAt as string));
  const recent = done.filter((d) => d > recentStart && d <= now).length;
  const before = done.filter((d) => d > beforeStart && d <= recentStart).length;
  return { recent, before, falling: before >= risk.activityMinBefore && recent <= before * risk.activityDropShare };
}

/** Ratings oldest first; "declining" when the latest few average well below the ones before. */
export function ratingTrend(ratings: readonly number[], risk: Pick<typeof CHURN.risk, 'recentReviews' | 'ratingDropBy'> = CHURN.risk) {
  if (ratings.length < risk.recentReviews * 2) return { recent: null, earlier: null, declining: false };
  const avg = (xs: readonly number[]) => Math.round(xs.reduce((s, n) => s + n, 0) / xs.length * 10) / 10;
  const recent = avg(ratings.slice(-risk.recentReviews));
  const earlier = avg(ratings.slice(0, -risk.recentReviews));
  return { recent, earlier, declining: earlier - recent >= risk.ratingDropBy };
}

