import type { DeliveryOutcome, ReminderChannel, ReminderStatus } from './types';

export const REMINDER_CHANNEL = {
  Push: 'push',
  Sms: 'sms',
  InApp: 'in_app'
} as const;

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  push: 'Push',
  sms: 'SMS',
  in_app: 'In-app'
};

export const REMINDER_STATUS = {
  /** Waiting for its fire time. */
  Scheduled: 'scheduled',
  /** Fired: each channel's outcome is in the delivery log. */
  Sent: 'sent',
  /** Never fired: its time had already passed when the job was booked or moved. */
  Skipped: 'skipped',
  /** Withdrawn: the job was cancelled, started, completed or moved to a new time. */
  Cancelled: 'cancelled'
} as const;

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  scheduled: 'Scheduled',
  sent: 'Sent',
  skipped: 'Skipped',
  cancelled: 'Cancelled'
};

export const DELIVERY_OUTCOME = {
  Delivered: 'delivered',
  Failed: 'failed',
  Skipped: 'skipped'
} as const;

export const DELIVERY_OUTCOME_LABELS: Record<DeliveryOutcome, string> = {
  delivered: 'Delivered',
  failed: 'Failed',
  skipped: 'Not sent'
};

/** One SMS segment. Longer messages are split (and cost more), so templates aim to fit in one. */
export const SMS_SEGMENT_LENGTH = 160;

/**
 * Nigerian mobile numbers: +234 or 0, then a 070, 080, 081, 090 or 091 prefix and 8 digits.
 * Matched after removing spaces, dashes and brackets.
 */
export const NIGERIAN_MOBILE_PATTERN = /^(?:\+234|0)(?:70|80|81|90|91)\d{8}$/;

/* ---------- Routes ---------- */

export const REMINDER_ROUTES = {
  customerPreferences: '/profile/notifications',
  vendorPreferences: '/pro/notifications',
  /** Dev builds only: the reminder log and fire-time panel. */
  devPanel: '/dev/reminders'
} as const;
