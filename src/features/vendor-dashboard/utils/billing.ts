import { addMonths, differenceInCalendarDays, endOfDay, startOfDay } from 'date-fns';
import { formatNaira } from '../../../utils/format';
import { INVOICE_KIND, SUBSCRIPTION_STATUS } from '../constants';
import { planById } from '../plans';
import { getSubscriptionStatus, nextPeriod } from './subscription';
import type { InvoiceKind, InvoiceQuote, PlanId, Subscription } from '../types';

/*
 * Subscription billing rules. Pure: every function takes `now`. Tested in billing.test.ts.
 */

/** Average month length, to count how many monthly periods a paid span covers. */
const DAYS_PER_MONTH = 30.44;

export interface Proration {
  /** Days left in the paid span, counting today. */
  remainingDays: number;
  totalDays: number;
  /** Monthly periods paid for in the span (more than 1 after renewing early). */
  months: number;
  /** Unused value of the current plan, returned as credit. */
  credit: number;
  /** The new plan's price for the remaining days. */
  charge: number;
  /** charge − credit, never below 0. */
  due: number;
}

/**
 * Upgrade mid-period: pay the new plan's price for the days left, minus what's unused on the current
 * plan. Both are pro rata by calendar day (today counts as remaining) and rounded to whole Naira. If the
 * vendor renewed early, the paid span covers several months, and both prices are scaled to match.
 */
export function prorateUpgrade(fromPrice: number, toPrice: number, periodStart: string, periodEnd: string, now: Date): Proration {
  const totalDays = Math.max(1, differenceInCalendarDays(new Date(periodEnd), new Date(periodStart)) + 1);
  const remainingDays = Math.min(totalDays, Math.max(0, differenceInCalendarDays(new Date(periodEnd), now) + 1));
  const months = Math.max(1, Math.round(totalDays / DAYS_PER_MONTH));
  const credit = Math.round(fromPrice * months * remainingDays / totalDays);
  const charge = Math.round(toPrice * months * remainingDays / totalDays);
  return { remainingDays, totalDays, months, credit, charge, due: Math.max(0, charge - credit) };
}

/** Is choosing `target` a renewal, an upgrade, a downgrade, or (after the profile is limited) a fresh subscription? */
export function changeKind(sub: Subscription, target: PlanId, now: Date): InvoiceKind {
  if (getSubscriptionStatus(sub.renewsOn, now) === SUBSCRIPTION_STATUS.Expired) return INVOICE_KIND.Subscribe;
  if (target === sub.planId) return INVOICE_KIND.Renew;
  return planById(target).price > planById(sub.planId).price ? INVOICE_KIND.Upgrade : INVOICE_KIND.Downgrade;
}

/**
 * What a renewal or plan change costs and when it takes effect:
 * - Subscribe (after lapsing): full price, starts today.
 * - Renew: full price for the next period (from the current end date, or today if lapsed).
 * - Upgrade: prorated, takes effect now; the end date stays the same. In the grace period there are no
 *   days left to prorate, so it's charged like a renewal on the new plan.
 * - Downgrade: the next period at the lower price, taking effect when the current period ends.
 */
export function quoteChange(sub: Subscription, target: PlanId, now: Date): InvoiceQuote {
  const kind = changeKind(sub, target, now);
  const from = planById(sub.planId);
  const to = planById(target);
  const base = { planId: target, fromPlanId: sub.planId };
  const inPeriod = new Date(sub.renewsOn) >= now;

  if (kind === INVOICE_KIND.Subscribe) {
    const start = startOfDay(now);
    const end = endOfDay(addMonths(now, 1));
    return { ...base, kind, amount: to.price, lines: [{ label: `${to.name}, 1 month`, amount: to.price }], periodStart: start.toISOString(), periodEnd: end.toISOString(), effectiveAt: now.toISOString() };
  }
  if (kind === INVOICE_KIND.Upgrade && inPeriod) {
    const p = prorateUpgrade(from.price, to.price, sub.periodStart, sub.renewsOn, now);
    const span = p.months > 1 ? ` × ${p.months} months` : '';
    return {
      ...base,
      kind,
      amount: p.due,
      lines: [
      { label: `${to.name}: ${formatNaira(to.price)}${span} × ${p.remainingDays}/${p.totalDays} days left`, amount: p.charge },
      { label: `Credit for unused ${from.name}: ${formatNaira(from.price)}${span} × ${p.remainingDays}/${p.totalDays} days`, amount: -p.credit }],

      periodStart: startOfDay(now).toISOString(),
      periodEnd: sub.renewsOn,
      effectiveAt: now.toISOString()
    };
  }
  // Renew, downgrade, or an upgrade after the period ended: pay for the next period.
  const period = nextPeriod(sub.renewsOn, now);
  const effective = kind === INVOICE_KIND.Upgrade || !inPeriod ? now : period.start;
  return {
    ...base,
    kind,
    amount: to.price,
    lines: [{ label: `${to.name}, 1 month`, amount: to.price }],
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    effectiveAt: effective.toISOString()
  };
}
