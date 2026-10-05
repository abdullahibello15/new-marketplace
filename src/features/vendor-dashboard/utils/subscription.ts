import { addMonths, differenceInCalendarDays, endOfDay, max } from 'date-fns';
import { EXPIRY_WARNING_DAYS, SUBSCRIPTION_STATUS } from '../constants';
import type { SubscriptionStatus } from '../types';

/** Whole calendar days until the renewal date. 0 means today is the last day; negative means it has lapsed. */
export function daysUntil(renewsOn: string, now = new Date()): number {
  return differenceInCalendarDays(new Date(renewsOn), now);
}

export function getSubscriptionStatus(renewsOn: string, now = new Date()): SubscriptionStatus {
  const days = daysUntil(renewsOn, now);
  if (days < 0) return SUBSCRIPTION_STATUS.Expired;
  if (days <= EXPIRY_WARNING_DAYS) return SUBSCRIPTION_STATUS.ExpiringSoon;
  return SUBSCRIPTION_STATUS.Active;
}

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
