import { JOB_ACTOR, JOB_STATUS } from '../constants';
import { pendingReschedule } from '../reschedule';
import { transitionBlockedReason } from '../stateMachine';
import { isQuoteExpired } from './quote';
import type { Job, JobParty } from '../types';

/** A short prompt on a job card when this person needs to do something, or null. */
export function actionHint(job: Job, viewer: JobParty, now = new Date()): string | null {
  const reschedule = pendingReschedule(job);
  if (reschedule && reschedule.requestedBy !== viewer) return 'Reschedule request: accept or decline';

  if (viewer === JOB_ACTOR.Customer) {
    if (job.status === JOB_STATUS.Quoted && job.quote && !isQuoteExpired(job.quote, now)) return 'Quote ready: accept or reject';
    if (job.status === JOB_STATUS.AwaitingConfirmation) return 'Work done: confirm or report a problem';
    if (job.status === JOB_STATUS.Completed && !job.review) return 'Rate and review this job';
    return null;
  }
  if (job.status === JOB_STATUS.Requested) return 'New request: send a quote or decline';
  if (job.status === JOB_STATUS.Scheduled && !transitionBlockedReason(job, JOB_STATUS.InProgress, JOB_ACTOR.Vendor, now)) return 'Ready to start';
  if (job.status === JOB_STATUS.InProgress) return 'In progress: mark done when finished';
  return null;
}
