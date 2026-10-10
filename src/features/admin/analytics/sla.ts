import { addDays, addMinutes, format, startOfDay } from 'date-fns';
import { toMinutes, weekdayOfDate } from '../../../utils/workingHours';
import { SLA_RULES, SLA_SETTINGS, type SlaRule, type SlaType } from './slaConfig';
import type { WorkingHours } from '../../../types/marketplace';

/*
 * THE response-time SLA helper. Every response time and SLA verdict in the app — the admin SLA dashboard
 * and the public "Usually responds within…" line — comes from these functions, so the numbers match.
 * Pure: no clock reads (callers pass `now`), no I/O. Tested in sla.test.ts.
 *
 * "Working time" is the vendor's configured working hours on days that aren't blocked. Times are read in
 * the local time zone (the app runs on West Africa Time for Niger State vendors).
 */

export interface VendorSchedule {
  workingHours: WorkingHours;
  /** "yyyy-MM-dd" days the vendor took off. */
  blockedDates: ReadonlySet<string>;
}

/** The working window on one calendar day, or null if the vendor doesn't work that day. */
function windowOn(day: Date, s: VendorSchedule): {open: Date;close: Date;} | null {
  if (s.blockedDates.has(format(day, 'yyyy-MM-dd'))) return null;
  const hours = s.workingHours[weekdayOfDate(day)];
  if (!hours?.open) return null;
  const opens = toMinutes(hours.opensAt);
  const closes = toMinutes(hours.closesAt);
  if (!(closes > opens)) return null;
  const midnight = startOfDay(day);
  return { open: addMinutes(midnight, opens), close: addMinutes(midnight, closes) };
}

/** Does the vendor work at all (any open weekday)? Without hours, the clock never pauses. */
const hasWorkingHours = (s: VendorSchedule) => Object.values(s.workingHours).some((d) => d.open && toMinutes(d.closesAt) > toMinutes(d.opensAt));

/** Is `at` inside the vendor's working time? */
export function isWorkingTime(at: Date, s: VendorSchedule): boolean {
  const w = windowOn(at, s);
  return !!w && at >= w.open && at < w.close;
}

/**
 * Working minutes between two moments: only the parts inside working hours on non-blocked days count.
 * 0 if `to` isn't after `from`. With no working hours configured, it's plain elapsed minutes.
 */
export function businessMinutesBetween(from: Date, to: Date, s: VendorSchedule): number {
  if (to <= from) return 0;
  if (!hasWorkingHours(s)) return Math.round((to.getTime() - from.getTime()) / 60_000);
  let total = 0;
  for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
    const w = windowOn(day, s);
    if (!w) continue;
    const start = Math.max(w.open.getTime(), from.getTime());
    const end = Math.min(w.close.getTime(), to.getTime());
    if (end > start) total += (end - start) / 60_000;
  }
  return Math.round(total);
}

/**
 * The moment `minutes` of working time after `from` (the clock pauses outside working hours and on
 * blocked days). With no working hours configured, plain elapsed time.
 */
export function addBusinessMinutes(from: Date, minutes: number, s: VendorSchedule): Date {
  if (!hasWorkingHours(s)) return addMinutes(from, minutes);
  let left = minutes;
  for (let day = startOfDay(from), i = 0; i <= SLA_SETTINGS.maxLookaheadDays + Math.ceil(minutes / 60); day = addDays(day, 1), i++) {
    const w = windowOn(day, s);
    if (!w) continue;
    const start = w.open > from ? w.open : from;
    if (start >= w.close) continue;
    const available = (w.close.getTime() - start.getTime()) / 60_000;
    if (available >= left) return addMinutes(start, left);
    left -= available;
  }
  // No working time found ahead (all days blocked): fall back to real time.
  return addMinutes(from, minutes);
}

/**
 * THE SLA deadline for a request (see slaConfig.ts for the rule):
 *  - arrives during working hours → `withinHoursMinutes` of working time later;
 *  - arrives outside them → the later of `afterHoursWallClockMinutes` of real time and
 *    `withinHoursMinutes` of working time after the vendor next opens.
 */
export function slaDeadline(requestedAt: Date, rule: Pick<SlaRule, 'withinHoursMinutes' | 'afterHoursWallClockMinutes'>, s: VendorSchedule): Date {
  if (!hasWorkingHours(s)) return addMinutes(requestedAt, rule.withinHoursMinutes);
  const business = addBusinessMinutes(requestedAt, rule.withinHoursMinutes, s);
  if (isWorkingTime(requestedAt, s)) return business;
  const wall = addMinutes(requestedAt, rule.afterHoursWallClockMinutes);
  return wall > business ? wall : business;
}

export type SlaVerdict = 'met' | 'breached' | 'pending';

export interface SlaOutcome {
  verdict: SlaVerdict;
  deadline: Date;
  /** Working minutes to the response; null when there's no response yet. */
  responseMinutes: number | null;
  /** Working minutes past the deadline (0 when met or pending). */
  lateMinutes: number;
}

/**
 * Was one request answered in time? Answered by the deadline → met; answered after it, or still
 * unanswered once it has passed → breached; unanswered and not yet due → pending (not counted).
 */
export function evaluateResponse(
requestedAt: Date,
respondedAt: Date | null,
rule: Pick<SlaRule, 'withinHoursMinutes' | 'afterHoursWallClockMinutes'>,
s: VendorSchedule,
now: Date)
: SlaOutcome {
  const deadline = slaDeadline(requestedAt, rule, s);
  if (respondedAt) {
    const late = respondedAt > deadline ? businessMinutesBetween(deadline, respondedAt, s) : 0;
    return { verdict: respondedAt <= deadline ? 'met' : 'breached', deadline, responseMinutes: businessMinutesBetween(requestedAt, respondedAt, s), lateMinutes: late };
  }
  if (now > deadline) return { verdict: 'breached', deadline, responseMinutes: null, lateMinutes: businessMinutesBetween(deadline, now, s) };
  return { verdict: 'pending', deadline, responseMinutes: null, lateMinutes: 0 };
}

/** The p-th percentile (0–100) of some numbers, by nearest rank; null for none. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(p / 100 * sorted.length));
  return sorted[Math.min(sorted.length, rank) - 1];
}

/**
 * "Usually responds within…": the median working-time response to new requests over the last
 * `typicalWindowDays`, once there are at least `typicalMinSamples` of them; null otherwise.
 */
export function typicalResponseMinutes(responses: readonly {requestedAt: Date;responseMinutes: number | null;}[], now: Date, settings = SLA_SETTINGS): number | null {
  const since = addDays(now, -settings.typicalWindowDays);
  const minutes = responses.filter((r) => r.requestedAt >= since && r.responseMinutes !== null).map((r) => r.responseMinutes as number);
  return minutes.length >= settings.typicalMinSamples ? percentile(minutes, 50) : null;
}

/* ---------- Aggregating many responses (the admin SLA dashboard) ---------- */

export interface EvaluatedResponse<T extends {vendorId: string;type: SlaType;requestedAt: string;respondedAt: string | null;}> {
  fact: T;
  outcome: SlaOutcome;
}

/** Every response judged against its type's rule on its vendor's clock. */
export function evaluateAll<T extends {vendorId: string;type: SlaType;requestedAt: string;respondedAt: string | null;}>(
facts: readonly T[],
scheduleOf: (vendorId: string) => VendorSchedule,
now: Date,
rules: Record<SlaType, Pick<SlaRule, 'withinHoursMinutes' | 'afterHoursWallClockMinutes'>> = SLA_RULES)
: EvaluatedResponse<T>[] {
  return facts.map((fact) => ({
    fact,
    outcome: evaluateResponse(new Date(fact.requestedAt), fact.respondedAt ? new Date(fact.respondedAt) : null, rules[fact.type], scheduleOf(fact.vendorId), now)
  }));
}

/**
 * Compliance = met ÷ (met + breached), as a % to one decimal (pending requests aren't counted yet); null
 * with nothing decided. Response times are working minutes over the answered requests.
 */
export function slaStats(rows: readonly {outcome: SlaOutcome;}[]) {
  const met = rows.filter((r) => r.outcome.verdict === 'met').length;
  const breached = rows.filter((r) => r.outcome.verdict === 'breached').length;
  const minutes = rows.flatMap((r) => r.outcome.responseMinutes === null ? [] : [r.outcome.responseMinutes]);
  return {
    total: rows.length,
    met,
    breached,
    pending: rows.length - met - breached,
    compliance: met + breached ? Math.round(met / (met + breached) * 1000) / 10 : null,
    average: minutes.length ? Math.round(minutes.reduce((s, n) => s + n, 0) / minutes.length) : null,
    median: percentile(minutes, 50),
    p90: percentile(minutes, 90)
  };
}
