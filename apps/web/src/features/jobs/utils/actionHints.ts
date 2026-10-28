import i18n from '../../../i18n';
import { JOB_ACTOR, JOB_STATUS } from '../constants';
import { pendingReschedule } from '../reschedule';
import { transitionBlockedReason } from '../stateMachine';
import { isQuoteExpired } from './quote';
import type { Job, JobParty } from '../types';

/** A short prompt on a job card when this person needs to do something, or null. */
export function actionHint(job: Job, viewer: JobParty, now = new Date()): string | null {
  const reschedule = pendingReschedule(job);
  if (reschedule && reschedule.requestedBy !== viewer) return i18n.t('jobs:hint.reschedule');

  if (viewer === JOB_ACTOR.Customer) {
    if (job.status === JOB_STATUS.Quoted && job.quote && !isQuoteExpired(job.quote, now)) return i18n.t('jobs:hint.quoteReady');
    if (job.status === JOB_STATUS.AwaitingConfirmation) return i18n.t('jobs:hint.workDone');
    if (job.status === JOB_STATUS.Completed && !job.review) return i18n.t('jobs:hint.review');
    return null;
  }
  if (job.status === JOB_STATUS.Requested) return i18n.t('jobs:hint.newRequest');
  if (job.status === JOB_STATUS.Scheduled && !transitionBlockedReason(job, JOB_STATUS.InProgress, JOB_ACTOR.Vendor, now)) return i18n.t('jobs:hint.readyToStart');
  if (job.status === JOB_STATUS.InProgress) return i18n.t('jobs:hint.inProgress');
  return null;
}
