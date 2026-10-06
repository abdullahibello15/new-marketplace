import { JOB_ACTOR } from '../jobs/constants';
import type { ReminderRule } from './types';

/**
 * Booking reminder rules: the one place to change when reminders go out and to whom.
 * Each Scheduled job gets one reminder per rule per recipient, `minutesBefore` its start time.
 * Which channels (push, SMS) a reminder uses is decided when it fires, from that person's preferences.
 * The wording for each rule lives in templates.ts under the same id.
 */
export const REMINDER_RULES: readonly ReminderRule[] = [
{ id: 'day_before', minutesBefore: 24 * 60, lead: '24 hours', recipients: [JOB_ACTOR.Customer, JOB_ACTOR.Vendor] },
{ id: 'two_hours', minutesBefore: 2 * 60, lead: '2 hours', recipients: [JOB_ACTOR.Customer, JOB_ACTOR.Vendor] }];


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
