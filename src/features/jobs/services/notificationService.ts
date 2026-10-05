import { mockResponse } from '../../../services/mockApi';
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
