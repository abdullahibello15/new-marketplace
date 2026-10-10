import { JOB_ACTOR } from '../jobs/constants';
import type { ReminderRule, SubscriptionReminderStep } from './types';

/**
 * Booking reminder rules: the one place to change when reminders go out and to whom.
 * Each Scheduled job gets one reminder per rule per recipient, `minutesBefore` its start time.
 * Which channels (push, SMS) a reminder uses is decided when it fires, from that person's preferences.
 * The wording for each rule lives in templates.ts under the same id.
 */
export const REMINDER_RULES: readonly ReminderRule[] = [
{ id: 'day_before', minutesBefore: 24 * 60, lead: '24 hours', recipients: [JOB_ACTOR.Customer, JOB_ACTOR.Vendor] },
{ id: 'two_hours', minutesBefore: 2 * 60, lead: '2 hours', recipients: [JOB_ACTOR.Customer, JOB_ACTOR.Vendor] }];


/**
 * Subscription renewal reminders: days relative to the end date. Negative = before it, 0 = on the day,
 * positive = after it (grace period, then suspension once the grace days are over). Change them here.
 */
export const SUBSCRIPTION_REMINDER_SCHEDULE: readonly SubscriptionReminderStep[] = [
{ id: 'sub_minus_7', daysFromExpiry: -7 },
{ id: 'sub_minus_3', daysFromExpiry: -3 },
{ id: 'sub_minus_1', daysFromExpiry: -1 },
{ id: 'sub_day_0', daysFromExpiry: 0 },
{ id: 'sub_plus_1', daysFromExpiry: 1 },
{ id: 'sub_plus_3', daysFromExpiry: 3 },
{ id: 'sub_plus_7', daysFromExpiry: 7 },
// With a 7-day grace period this one falls in suspension.
{ id: 'sub_plus_10', daysFromExpiry: 10 }];


/** Subscription reminders go out at this local time on their day. */
export const SUBSCRIPTION_REMINDER_TIME = { hour: 9, minute: 0 } as const;

/** Base for the [link] placeholder in texts (MOCK domain). */
export const APP_LINK_BASE = 'https://gwani.ng';

/* ---------- MOCK delivery (remove with the real push/SMS backend) ---------- */

export const MOCK_DELIVERY = {
  /** Latency of the reminder API calls, in ms. */
  latencyMs: 150,
  /** SMS to numbers ending in this always fails, so the failure path can be tested. */
  failingSmsSuffix: '0000'
} as const;

/** Defaults for someone who has never opened the preferences page. */
export const DEFAULT_PREFERENCES = {
  push: true,
  sms: false,
  optedOut: false
} as const;
