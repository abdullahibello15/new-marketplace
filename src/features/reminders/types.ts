import type { JobParty } from '../jobs/types';
import type { DELIVERY_OUTCOME, REMINDER_CHANNEL, REMINDER_STATUS } from './constants';

type ValueOf<T> = T[keyof T];

export type ReminderChannel = ValueOf<typeof REMINDER_CHANNEL>;
export type ReminderStatus = ValueOf<typeof REMINDER_STATUS>;
export type DeliveryOutcome = ValueOf<typeof DELIVERY_OUTCOME>;

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

/** One reminder for one person about one job. */
export interface ScheduledReminder {
  id: string;
  jobId: string;
  ruleId: ReminderRuleId;
  recipient: JobParty;
  /** Customer id or vendor id. */
  recipientId: string;
  /** The job start this reminder was made for. */
  jobStart: string;
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
  /** Turns off every booking reminder, whatever the toggles say. */
  optedOut: boolean;
}
