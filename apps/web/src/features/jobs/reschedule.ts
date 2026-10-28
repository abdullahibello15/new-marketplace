import { subHours } from 'date-fns';
import i18n from '../../i18n';
import { JOB_STATUS, RESCHEDULE_CUTOFF_HOURS, RESCHEDULE_MAX_REQUESTS, RESCHEDULE_STATUS } from './constants';
import type { Job, JobParty, RescheduleRequest } from './types';

/*
 * Reschedule rules. A reschedule changes when a Scheduled job happens, not its status, so it lives
 * beside the state machine rather than in its transition table, and is only ever possible while the
 * job is Scheduled.
 */

export const pendingReschedule = (job: Pick<Job, 'reschedules'>): RescheduleRequest | null =>
job.reschedules.find((r) => r.status === RESCHEDULE_STATUS.Pending) ?? null;

export const reschedulesLeft = (job: Pick<Job, 'reschedules'>) => Math.max(0, RESCHEDULE_MAX_REQUESTS - job.reschedules.length);

/** Why a reschedule can’t be requested right now (by either side), or null if it can. */
export function rescheduleBlockedReason(job: Job, now = new Date()): string | null {
  if (job.status !== JOB_STATUS.Scheduled || !job.scheduledAt) return i18n.t('jobs:rescheduleRule.onlyScheduled');
  if (pendingReschedule(job)) return i18n.t('jobs:rescheduleRule.alreadyWaiting');
  if (reschedulesLeft(job) === 0) return i18n.t('jobs:rescheduleRule.maxReached', { max: RESCHEDULE_MAX_REQUESTS });
  if (now >= subHours(new Date(job.scheduledAt), RESCHEDULE_CUTOFF_HOURS)) {
    return i18n.t('jobs:rescheduleRule.tooClose', { hours: RESCHEDULE_CUTOFF_HOURS });
  }
  return null;
}

/** Why `by` can't answer the pending request, or null if they can. Only the other side may answer. */
export function rescheduleResponseBlockedReason(job: Job, requestId: string, by: JobParty): string | null {
  const request = job.reschedules.find((r) => r.id === requestId);
  if (!request || request.status !== RESCHEDULE_STATUS.Pending) return i18n.t('jobs:rescheduleRule.answered');
  if (request.requestedBy === by) return i18n.t('jobs:rescheduleRule.ownRequest');
  if (job.status !== JOB_STATUS.Scheduled) return i18n.t('jobs:rescheduleRule.noLonger');
  return null;
}
