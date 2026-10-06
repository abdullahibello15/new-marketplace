import { format, subMinutes } from 'date-fns';
import { user } from '../../../data/user';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { CURRENT_CUSTOMER_ID, JOB_ACTOR, JOB_STATUS } from '../../jobs/constants';
import { recordJobNotification } from '../../jobs/services/notificationService';
import { DEFAULT_PREFERENCES, MOCK_DELIVERY, REMINDER_RULES } from '../config';
import { DELIVERY_OUTCOME, REMINDER_CHANNEL, REMINDER_STATUS } from '../constants';
import { relativeDay, renderReminder } from '../templates';
import { maskPhone, toE164 } from '../utils/phone';
import type { Job, JobParty } from '../../jobs/types';
import type { DeliveryLogEntry, NotificationPreferences, ReminderChannel, ScheduledReminder } from '../types';

/*
 * MOCK reminder service. Everything up to the push/SMS boundary is real logic: which reminders a booking
 * gets, when they fire, what they say, and whose preferences apply. The "send" itself is simulated:
 * delivered messages go to an in-memory log (and the in-app Updates list) instead of a phone.
 *
 * Real API shape: POST /reminders/schedule, DELETE /jobs/:id/reminders, PUT /jobs/:id/reminders.
 * In production the job service's state-change events would call these server-side and a
 * scheduler (cron or queue) would deliver due reminders through a push and SMS provider.
 */
let reminders: ScheduledReminder[] = [];
let log: DeliveryLogEntry[] = [];
let nextReminderId = 1;
let nextLogId = 1;

const prefKey = (party: JobParty, id: string) => `${party}:${id}`;
const preferences = new Map<string, NotificationPreferences>([
// The demo customer has a phone on file, so SMS starts on for her.
[prefKey(JOB_ACTOR.Customer, CURRENT_CUSTOMER_ID), { ...DEFAULT_PREFERENCES, sms: true, phone: toE164(user.phone) }]]
);

function preferencesFor(party: JobParty, id: string): NotificationPreferences {
  return preferences.get(prefKey(party, id)) ?? { ...DEFAULT_PREFERENCES, phone: '' };
}

const recipientIdOf = (job: Job, party: JobParty) => party === JOB_ACTOR.Customer ? job.customerId : job.vendorId;

/** Builds this job's reminders from the rules. Ones whose time has passed are kept as Skipped, so it's clear why nothing came. */
function buildReminders(job: Job, now: Date): ScheduledReminder[] {
  if (!job.scheduledAt) return [];
  const start = new Date(job.scheduledAt);
  const createdAt = now.toISOString();
  return REMINDER_RULES.flatMap((rule) =>
  rule.recipients.map((recipient): ScheduledReminder => {
    const fireAt = subMinutes(start, rule.minutesBefore);
    const late = fireAt <= now;
    return {
      id: `rem-${nextReminderId++}`,
      jobId: job.id,
      ruleId: rule.id,
      recipient,
      recipientId: recipientIdOf(job, recipient),
      jobStart: job.scheduledAt ?? createdAt,
      fireAt: fireAt.toISOString(),
      status: late ? REMINDER_STATUS.Skipped : REMINDER_STATUS.Scheduled,
      message: renderReminder(rule.id, recipient, {
        service: job.serviceName ?? 'booking',
        vendor: job.vendorName,
        customer: job.customerName,
        day: relativeDay(start, fireAt),
        time: format(start, 'h:mm a'),
        address: `${job.address.landmark}, ${job.address.placeLabel}.`,
        lead: rule.lead,
        ref: `#${job.id}`
      }),
      createdAt,
      closedAt: late ? createdAt : null,
      closedReason: late ? `The ${rule.lead} mark had already passed when it was booked.` : null
    };
  })
  );
}

function scheduleNow(job: Job, now: Date): ScheduledReminder[] {
  if (job.status !== JOB_STATUS.Scheduled || !job.scheduledAt) throw new ApiError('Only scheduled jobs get reminders.', 409);
  // Idempotent: scheduling again replaces what's pending rather than doubling up.
  cancelNow(job.id, 'Replaced by a new schedule', now);
  const created = buildReminders(job, now);
  reminders = [...reminders, ...created];
  return created;
}

function cancelNow(jobId: string, reason: string, now: Date): number {
  let count = 0;
  reminders = reminders.map((r) => {
    if (r.jobId !== jobId || r.status !== REMINDER_STATUS.Scheduled) return r;
    count += 1;
    return { ...r, status: REMINDER_STATUS.Cancelled, closedAt: now.toISOString(), closedReason: reason };
  });
  return count;
}

/* ---------- The API a real backend would expose ---------- */

/** POST /reminders/schedule — creates the job's reminders from the rules. Called when a job becomes Scheduled. */
export function scheduleReminders(job: Job): Promise<ScheduledReminder[]> {
  return mockResponse(() => scheduleNow(job, new Date()), MOCK_DELIVERY.latencyMs);
}

/** DELETE /jobs/:id/reminders — withdraws pending reminders. Called when a job is cancelled, started or completed. */
export function cancelReminders(jobId: string, reason = 'The booking changed'): Promise<{cancelled: number;}> {
  return mockResponse(() => ({ cancelled: cancelNow(jobId, reason, new Date()) }), MOCK_DELIVERY.latencyMs);
}

/** PUT /jobs/:id/reminders — the booked time moved: pending reminders are withdrawn and new ones made for the new time. */
export function rescheduleReminders(job: Job): Promise<ScheduledReminder[]> {
  return mockResponse(() => {
    const now = new Date();
    cancelNow(job.id, `Moved to ${job.scheduledAt ? format(new Date(job.scheduledAt), 'EEE d MMM, h:mm a') : 'a new time'}`, now);
    return scheduleNow(job, now);
  }, MOCK_DELIVERY.latencyMs);
}

/** GET /jobs/:id/reminders?recipient= — what this person will get about this job, soonest first. */
export function listJobReminders(jobId: string, recipient: JobParty): Promise<ScheduledReminder[]> {
  return mockResponse(() => reminders.filter((r) => r.jobId === jobId && r.recipient === recipient).sort((a, b) => a.fireAt.localeCompare(b.fireAt)), 200);
}

/* ---------- Preferences ---------- */

/** GET /me/notification-preferences */
export function getPreferences(party: JobParty, id: string): Promise<NotificationPreferences> {
  return mockResponse(() => preferencesFor(party, id), 250);
}

/** PUT /me/notification-preferences — applies to reminders already scheduled too, since channels are picked when one fires. */
export function savePreferences(party: JobParty, id: string, next: NotificationPreferences): Promise<NotificationPreferences> {
  return mockResponse(() => {
    if (next.sms && !next.optedOut && !next.phone) throw new ApiError('Add a phone number to get SMS reminders.', 400);
    preferences.set(prefKey(party, id), next);
    return next;
  }, 500);
}

/* ---------- MOCK delivery ---------- */

function logAttempt(r: ScheduledReminder, channel: ReminderChannel, outcome: DeliveryLogEntry['outcome'], detail: string, text: string, at: string) {
  log = [{ id: `log-${nextLogId++}`, reminderId: r.id, jobId: r.jobId, recipient: r.recipient, recipientId: r.recipientId, channel, outcome, detail, text, at }, ...log];
}

/** "Sends" one reminder on each channel the person has on, honouring opt-out, and records every attempt. */
function deliver(r: ScheduledReminder, now: Date): ScheduledReminder {
  const at = now.toISOString();
  const prefs = preferencesFor(r.recipient, r.recipientId);
  const sent: ScheduledReminder = { ...r, status: REMINDER_STATUS.Sent, closedAt: at, closedReason: null };
  if (prefs.optedOut) {
    logAttempt(r, REMINDER_CHANNEL.Push, DELIVERY_OUTCOME.Skipped, 'Opted out of reminders', r.message.pushBody, at);
    return { ...sent, closedReason: 'Opted out: nothing was sent' };
  }

  // In-app: always, into the same Updates list as other job news.
  recordJobNotification(r.jobId, r.recipient, r.recipientId, r.message.pushTitle, r.message.pushBody, at);
  logAttempt(r, REMINDER_CHANNEL.InApp, DELIVERY_OUTCOME.Delivered, 'Updates list', r.message.pushBody, at);

  if (prefs.push) logAttempt(r, REMINDER_CHANNEL.Push, DELIVERY_OUTCOME.Delivered, 'Phone app (mock device)', `${r.message.pushTitle}: ${r.message.pushBody}`, at);else
  logAttempt(r, REMINDER_CHANNEL.Push, DELIVERY_OUTCOME.Skipped, 'Push turned off', r.message.pushBody, at);

  if (!prefs.sms) logAttempt(r, REMINDER_CHANNEL.Sms, DELIVERY_OUTCOME.Skipped, 'SMS turned off', r.message.sms, at);else
  if (!prefs.phone) logAttempt(r, REMINDER_CHANNEL.Sms, DELIVERY_OUTCOME.Skipped, 'No phone number', r.message.sms, at);else
  if (prefs.phone.endsWith(MOCK_DELIVERY.failingSmsSuffix)) logAttempt(r, REMINDER_CHANNEL.Sms, DELIVERY_OUTCOME.Failed, `${maskPhone(prefs.phone)}: provider rejected the number (mock)`, r.message.sms, at);else
  logAttempt(r, REMINDER_CHANNEL.Sms, DELIVERY_OUTCOME.Delivered, maskPhone(prefs.phone), r.message.sms, at);
  return sent;
}

/**
 * MOCK scheduler tick: delivers every reminder whose time has come. The job service runs it with its
 * other scheduled tasks on each read; a real backend would use a job queue.
 */
export function deliverDueReminders(now = new Date()): number {
  let count = 0;
  reminders = reminders.map((r) => {
    if (r.status !== REMINDER_STATUS.Scheduled || new Date(r.fireAt) > now) return r;
    count += 1;
    return deliver(r, now);
  });
  return count;
}

/* ---------- Dev panel (testing only) ---------- */

export function listAllReminders(): Promise<ScheduledReminder[]> {
  return mockResponse(() => [...reminders].sort((a, b) => a.fireAt.localeCompare(b.fireAt)), 150);
}

export function listDeliveryLog(): Promise<DeliveryLogEntry[]> {
  return mockResponse(() => log, 150);
}

/** Fires one scheduled reminder now, ignoring its time. */
export function sendReminderNow(id: string): Promise<ScheduledReminder> {
  return mockResponse(() => {
    const r = reminders.find((x) => x.id === id);
    if (!r) throw new ApiError('That reminder doesn’t exist.', 404);
    if (r.status !== REMINDER_STATUS.Scheduled) throw new ApiError('Only scheduled reminders can be sent.', 409);
    const sent = deliver(r, new Date());
    reminders = reminders.map((x) => x.id === id ? sent : x);
    return sent;
  }, 300);
}

/** Runs the delivery check now (what the scheduler does on its own). */
export function runDeliveryCheck(): Promise<{sent: number;}> {
  return mockResponse(() => ({ sent: deliverDueReminders() }), 300);
}
