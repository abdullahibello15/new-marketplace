import { recipientLanguage, tIn } from '../../../i18n/recipient';
import { mockResponse } from '../../../services/mockApi';
import type { TFunction } from 'i18next';
import { JOB_ACTOR } from '../constants';
import { notificationsFor, type JobEvent } from '../utils/notificationCopy';
import type { Job, JobNotification, JobParty } from '../types';

/*
 * MOCK in-app notifications. The job service calls recordJobEvent for every status change and
 * reschedule event; a real backend would do this server-side (and send push/SMS too).
 */
let notifications: JobNotification[] = [];
let nextId = 1;

/** Called by the job service. Not exported to the UI: notifications are never created by hand. */
export function recordJobEvent(job: Job, event: JobEvent, at = new Date().toISOString(), read = false): void {
  const created = notificationsFor(job, event).map((draft): JobNotification => ({
    id: `n${nextId++}`,
    recipient: draft.recipient,
    recipientId: draft.recipient === JOB_ACTOR.Customer ? job.customerId : job.vendorId,
    jobId: job.id,
    title: draft.title,
    body: draft.body,
    createdAt: at,
    read
  }));
  notifications = [...created, ...notifications];
}

/** Adds one ready-written notification about a job, e.g. a booking reminder from the reminder service. */
export function recordJobNotification(jobId: string, recipient: JobParty, recipientId: string, title: string, body: string, at = new Date().toISOString()): void {
  notifications = [{ id: `n${nextId++}`, recipient, recipientId, jobId, title, body, createdAt: at, read: false }, ...notifications];
}

/** Adds an account notice that isn't about a job (e.g. a subscription renewal reminder), opening `href`. */
export function recordAccountNotification(recipient: JobParty, recipientId: string, title: string, body: string, href: string, at = new Date().toISOString()): void {
  notifications = [{ id: `n${nextId++}`, recipient, recipientId, jobId: '', href, title, body, createdAt: at, read: false }, ...notifications];
}

/**
 * An account notice written in the recipient's saved language: `key` names the wording (with .title and
 * .body in the locale files), and `values` fills it, given a translate function in that language.
 */
export function recordAccountMessage(
recipient: JobParty,
recipientId: string,
key: string,
values: (t: TFunction) => Record<string, unknown>,
href: string,
at = new Date().toISOString())
: void {
  const t = tIn(recipientLanguage(recipient, recipientId));
  const v = values(t);
  recordAccountNotification(recipient, recipientId, t(`${key}.title`, v), t(`${key}.body`, v), href, at);
}

/** GET /me/notifications */
export function listNotifications(recipient: JobParty, recipientId: string): Promise<JobNotification[]> {
  return mockResponse(
    () => notifications.filter((n) => n.recipient === recipient && n.recipientId === recipientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    200
  );
}

/** POST /me/notifications/read-all */
export function markAllNotificationsRead(recipient: JobParty, recipientId: string): Promise<void> {
  return mockResponse(() => {
    notifications = notifications.map((n) => n.recipient === recipient && n.recipientId === recipientId ? { ...n, read: true } : n);
  }, 200);
}
