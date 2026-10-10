import { addDays, addMonths, differenceInCalendarDays, endOfDay, max, startOfDay } from 'date-fns';
import i18n from '../../../i18n';
import { SUBSCRIPTION_STATUS } from '../constants';
import { BILLING_RULES } from '../plans';
import type { SubscriptionStatus } from '../types';

/** Whole calendar days until the renewal date. 0 means today is the last day; negative means it has lapsed. */
export function daysUntil(renewsOn: string, now = new Date()): number {
  return differenceInCalendarDays(new Date(renewsOn), now);
}

/** End of the grace period: the vendor is soft-suspended after this. */
export function graceEndsAt(renewsOn: string): Date {
  return endOfDay(addDays(new Date(renewsOn), BILLING_RULES.graceDays));
}

/**
 * THE one place that decides a subscription's state from its dates. Search, booking and the dashboard
 * all go through it (via subscriptionService.vendorStanding).
 * Active → Expiring soon (warning window) → Grace period (lapsed, fully working) → Suspended (soft).
 */
export function getSubscriptionStatus(renewsOn: string, now = new Date()): SubscriptionStatus {
  const days = daysUntil(renewsOn, now);
  if (days < 0) return now > graceEndsAt(renewsOn) ? SUBSCRIPTION_STATUS.Suspended : SUBSCRIPTION_STATUS.Grace;
  if (days <= BILLING_RULES.expiryWarningDays) return SUBSCRIPTION_STATUS.ExpiringSoon;
  return SUBSCRIPTION_STATUS.Active;
}

/** Soft-suspended: only once the grace period is over. */
export const isSuspended = (renewsOn: string, now = new Date()) => getSubscriptionStatus(renewsOn, now) === SUBSCRIPTION_STATUS.Suspended;

/** "5 days left", "Last day today", "Expired 3 days ago". */
export function describeDaysLeft(days: number): string {
  if (days > 0) return i18n.t('vendor:subscription.daysLeft', { count: days });
  if (days === 0) return i18n.t('vendor:subscription.lastDay');
  return i18n.t('vendor:subscription.expiredAgo', { count: Math.abs(days) });
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
