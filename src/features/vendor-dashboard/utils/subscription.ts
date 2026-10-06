import { addDays, addMonths, differenceInCalendarDays, endOfDay, max, startOfDay } from 'date-fns';
import { SUBSCRIPTION_STATUS } from '../constants';
import { BILLING_RULES } from '../plans';
import type { SubscriptionStatus } from '../types';

/** Whole calendar days until the renewal date. 0 means today is the last day; negative means it has lapsed. */
export function daysUntil(renewsOn: string, now = new Date()): number {
  return differenceInCalendarDays(new Date(renewsOn), now);
}

/** End of the grace period: the profile is limited after this. */
export function graceEndsAt(renewsOn: string): Date {
  return endOfDay(addDays(new Date(renewsOn), BILLING_RULES.graceDays));
}

/** Active → Expiring soon (warning window) → Grace (lapsed, still visible) → Expired (profile limited). */
export function getSubscriptionStatus(renewsOn: string, now = new Date()): SubscriptionStatus {
  const days = daysUntil(renewsOn, now);
  if (days < 0) return now > graceEndsAt(renewsOn) ? SUBSCRIPTION_STATUS.Expired : SUBSCRIPTION_STATUS.Grace;
  if (days <= BILLING_RULES.expiryWarningDays) return SUBSCRIPTION_STATUS.ExpiringSoon;
  return SUBSCRIPTION_STATUS.Active;
}

/** Hidden from search and not taking new requests: only once the grace period is over. */
export const isProfileLimited = (renewsOn: string, now = new Date()) => getSubscriptionStatus(renewsOn, now) === SUBSCRIPTION_STATUS.Expired;

/** "5 days left", "Last day today", "Expired 3 days ago". */
export function describeDaysLeft(days: number): string {
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (days === 0) return 'Last day today';
  const ago = Math.abs(days);
  return `Expired ${ago} ${ago === 1 ? 'day' : 'days'} ago`;
}

/** Renewing early adds a month to the current end date; renewing after it lapsed starts from today. */
export function nextRenewalDate(renewsOn: string, now = new Date()): Date {
  return endOfDay(addMonths(max([new Date(renewsOn), now]), 1));
}

/** The period a renewal pays for: from the end of the current one (or today, if lapsed) for one month. */
export function nextPeriod(renewsOn: string, now = new Date()): {start: Date;end: Date;} {
  const start = new Date(renewsOn) > now ? startOfDay(addDays(new Date(renewsOn), 1)) : startOfDay(now);
  return { start, end: nextRenewalDate(renewsOn, now) };
}
