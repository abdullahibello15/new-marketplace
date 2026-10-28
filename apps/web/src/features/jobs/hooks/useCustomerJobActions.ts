import i18n from '../../../i18n';
import { formatDate } from '../../../utils/format';
import { JOB_ACTOR } from '../constants';
import {
  cancelJob,
  confirmCompletion,
  reportProblem,
  requestReschedule,
  respondToReschedule,
  skipReview,
  submitReview } from
'../services/jobService';
import { useJobAction } from './useJobAction';
import type { ReportProblemFormData, ReviewFormData } from '../schemas';
import type { Job } from '../types';

/** Customer actions after booking: confirm or dispute, review, reschedule and cancel. */
export function useCustomerJobActions(job: Job, onUpdated: (job: Job) => void) {
  const { busy, run } = useJobAction(onUpdated);
  const by = JOB_ACTOR.Customer;

  return {
    busy,
    confirm: () => run('confirm', () => confirmCompletion(job.id), () => i18n.t('jobs:toast.confirmed')),
    report: (data: ReportProblemFormData) => run('report', () => reportProblem(job.id, data), () => i18n.t('jobs:toast.reported')),
    review: (data: ReviewFormData) => run('review', () => submitReview(job.id, data), () => i18n.t('jobs:toast.reviewed')),
    skip: () => run('skip', () => skipReview(job.id), () => i18n.t('jobs:toast.closed')),
    requestReschedule: (data: {proposedStart: string;reason: string;}) =>
    run('reschedule-request', () => requestReschedule(job.id, by, data), () => i18n.t('jobs:toast.rescheduleSent', { name: job.vendorName })),
    respondReschedule: (requestId: string, accept: boolean) =>
    run(
      accept ? 'reschedule-accept' : 'reschedule-decline',
      () => respondToReschedule(job.id, requestId, by, accept),
      (updated) => accept && updated.scheduledAt ? i18n.t('jobs:toast.moved', { date: formatDate(updated.scheduledAt, 'EEE d MMM, h:mm a') }) : i18n.t('jobs:toast.originalStands')
    ),
    cancel: (reason: string) => run('cancel', () => cancelJob(job.id, by, reason), () => i18n.t('jobs:toast.cancelled', { id: job.id, name: job.vendorName }))
  };
}
