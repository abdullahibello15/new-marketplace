import type { JobParty } from '../jobs/types';
import type { DELIVERY_OUTCOME, REMINDER_CHANNEL, REMINDER_STATUS, REMINDER_TOPIC, SUBSCRIPTION_AUDIENCE, SUBSCRIPTION_REMINDER_PHASE } from './constants';

type ValueOf<T> = T[keyof T];

export type ReminderChannel = ValueOf<typeof REMINDER_CHANNEL>;
export type ReminderStatus = ValueOf<typeof REMINDER_STATUS>;
export type DeliveryOutcome = ValueOf<typeof DELIVERY_OUTCOME>;
export type ReminderTopic = ValueOf<typeof REMINDER_TOPIC>;
/** Who a subscription reminder is for: a vendor paying for themselves, an association member, or the association admin. */
export type SubscriptionAudience = ValueOf<typeof SUBSCRIPTION_AUDIENCE>;
/** Which wording a subscription reminder uses, from where it falls relative to the end date. */
export type SubscriptionReminderPhase = ValueOf<typeof SUBSCRIPTION_REMINDER_PHASE>;

/** One step of the subscription reminder schedule (config.ts). */
export interface SubscriptionReminderStep {
  id: string;
  /** Days from the end date: negative before it, 0 on the day, positive after (grace, then suspension). */
  daysFromExpiry: number;
}

/** What subscriptionService passes to schedule one person's renewal reminders. */
export interface SubscriptionReminderTarget {
  /** Groups one person's reminders for one subscription, e.g. "vendor:bala-plumbing". Rescheduling replaces them. */
  key: string;
  audience: SubscriptionAudience;
  recipient: JobParty;
  recipientId: string;
  vendorName: string;
  planName: string;
  /** The end date the schedule counts from. */
  renewsOn: string;
  graceDays: number;
  associationName: string | null;
  /** App path the reminder opens (and links to in SMS). */
  path: string;
}

/** Ids of the rules in config.ts; templates.ts has wording for each. */
export type ReminderRuleId = 'day_before' | 'two_hours';

export interface ReminderRule {
  id: ReminderRuleId;
  minutesBefore: number;
  /** How far ahead, in words, for templates: "24 hours". */
  lead: string;
  recipients: readonly JobParty[];
}

/** The text one reminder sends on each channel, rendered when it's scheduled. */
export interface ReminderMessage {
  pushTitle: string;
  pushBody: string;
  sms: string;
}

/** One reminder for one person: about a booked job, or about a subscription's renewal. */
export interface ScheduledReminder {
  id: string;
  topic: ReminderTopic;
  /** The job (booking reminders); empty for subscription reminders. */
  jobId: string;
  /** Subscription reminders: which person's subscription (see SubscriptionReminderTarget.key); null for bookings. */
  subscriptionKey: string | null;
  /** A ReminderRuleId (bookings) or a SubscriptionReminderStep id. */
  ruleId: string;
  /** When it goes out, in words: "24 hours before", "3 days before expiry". */
  label: string;
  /** Where the in-app item leads; null uses the job page. */
  href: string | null;
  recipient: JobParty;
  /** Customer id, vendor id or association id. */
  recipientId: string;
  /** The date this reminder was scheduled from: the job start, or the subscription end date. */
  anchorAt: string;
  /** ISO time it goes out. */
  fireAt: string;
  status: ReminderStatus;
  message: ReminderMessage;
  createdAt: string;
  /** When it fired, was cancelled or skipped. */
  closedAt: string | null;
  /** Why it was cancelled or skipped. */
  closedReason: string | null;
}

/** One attempt to deliver a reminder on one channel (MOCK: nothing really leaves the app). */
export interface DeliveryLogEntry {
  id: string;
  reminderId: string;
  jobId: string;
  subscriptionKey: string | null;
  recipient: JobParty;
  recipientId: string;
  channel: ReminderChannel;
  outcome: DeliveryOutcome;
  /** Device or phone number it went to, or why it didn't go. */
  detail: string;
  /** The text sent. */
  text: string;
  at: string;
}

export interface NotificationPreferences {
  push: boolean;
  sms: boolean;
  /** E.164, e.g. "+2348035550142"; empty when not set. */
  phone: string;
  /** Turns off every reminder (bookings and subscription renewals), whatever the toggles say. */
  optedOut: boolean;
}
