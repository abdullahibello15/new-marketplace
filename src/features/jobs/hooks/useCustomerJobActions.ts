import { format } from 'date-fns';
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
    confirm: () => run('confirm', () => confirmCompletion(job.id), 'Thanks for confirming. Please rate the job.'),
    report: (data: ReportProblemFormData) => run('report', () => reportProblem(job.id, data), 'Problem reported. Gwani’s team will be in touch.'),
    review: (data: ReviewFormData) => run('review', () => submitReview(job.id, data), 'Thanks! Your review is posted.'),
    skip: () => run('skip', () => skipReview(job.id), 'Job closed.'),
    requestReschedule: (data: {proposedStart: string;reason: string;}) =>
    run('reschedule-request', () => requestReschedule(job.id, by, data), `Reschedule request sent to ${job.vendorName}.`),
    respondReschedule: (requestId: string, accept: boolean) =>
    run(
      accept ? 'reschedule-accept' : 'reschedule-decline',
      () => respondToReschedule(job.id, requestId, by, accept),
      (updated) => accept && updated.scheduledAt ? `Moved to ${format(new Date(updated.scheduledAt), 'EEE d MMM, h:mm a')}.` : 'The original time stands.'
    ),
    cancel: (reason: string) => run('cancel', () => cancelJob(job.id, by, reason), `Job #${job.id} cancelled. ${job.vendorName} has been told.`)
  };
}
