import { JOB_STATUS, JOB_STATUS_META } from '../jobs/constants';
import { cancelReminders, rescheduleReminders, scheduleReminders } from './services/reminderService';
import type { Job, JobStatus } from '../jobs/types';

/*
 * Where job state-machine events meet the reminder service. The job service calls these after it saves
 * a change; in production they'd be server-side event handlers. Calls aren't awaited: a reminder
 * failing to schedule must never block or undo the booking change itself.
 */

function report(error: unknown) {
  // Surfaced in the dev console only; the reminder line on the job page shows what actually got scheduled.
  if (import.meta.env.DEV) console.warn('Reminder update failed', error);
}

/** A job changed status: it became Scheduled (schedule reminders) or left Scheduled (withdraw them). */
export function onJobStatusChanged(job: Job, from: JobStatus): void {
  if (job.status === JOB_STATUS.Scheduled) {
    scheduleReminders(job).catch(report);
  } else if (from === JOB_STATUS.Scheduled || job.status === JOB_STATUS.Cancelled || job.status === JOB_STATUS.Completed) {
    // Cancelled, completed, or started (no "starts in 2 hours" once the vendor is there).
    cancelReminders(job.id, `Job ${JOB_STATUS_META[job.status].label.toLowerCase()}`).catch(report);
  }
}

/** An accepted reschedule moved the booked time. */
export function onJobRescheduled(job: Job): void {
  if (job.status === JOB_STATUS.Scheduled) rescheduleReminders(job).catch(report);
}

/** Bookings that already exist when the app starts (mock data) get their reminders too. */
export function onJobsLoaded(jobs: readonly Job[]): void {
  jobs.filter((j) => j.status === JOB_STATUS.Scheduled).forEach((j) => scheduleReminders(j).catch(report));
}
