import { useState } from 'react';
import { format } from 'date-fns';
import { JOB_ACTOR } from '../../jobs/constants';
import { useJobAction } from '../../jobs/hooks/useJobAction';
import {
  cancelJob,
  declineJob,
  markWorkDone,
  requestReschedule,
  respondToReschedule,
  sendQuote,
  startJob } from
'../../jobs/services/jobService';
import { useRequests } from './useRequests';
import type { Job, QuoteInput } from '../../jobs/types';

type Dialog = 'quote' | 'decline' | null;

/**
 * Every vendor action on a job: quote or decline a request, start it on arrival, mark the work done,
 * reschedule and cancel. Each has loading, success and error feedback via useJobAction.
 */
export function useJobActions(job: Job) {
  const { replaceJob } = useRequests();
  const { busy, run } = useJobAction(replaceJob);
  const [dialog, setDialog] = useState<Dialog>(null);
  const by = JOB_ACTOR.Vendor;

  return {
    busy,
    dialog,
    openQuote: () => setDialog('quote'),
    openDecline: () => setDialog('decline'),
    close: () => setDialog(null),
    sendQuote: (input: QuoteInput) => run('quote', () => sendQuote(job.id, input), `Quote sent to ${job.customerName}.`),
    decline: (reason: string) => run('decline', () => declineJob(job.id, reason), `Declined ${job.customerName}’s request.`),
    start: (shareLocation: boolean) =>
    run('start', () => startJob(job.id, { shareLocation }), (u) => `Job started at ${format(new Date(u.arrival?.at ?? Date.now()), 'h:mm a')}. ${job.customerName} has been told.`),
    markDone: () => run('done', () => markWorkDone(job.id), `Marked as done. ${job.customerName} has 48 hours to confirm.`),
    requestReschedule: (data: {proposedStart: string;reason: string;}) =>
    run('reschedule-request', () => requestReschedule(job.id, by, data), `Reschedule request sent to ${job.customerName}.`),
    respondReschedule: (requestId: string, accept: boolean) =>
    run(
      accept ? 'reschedule-accept' : 'reschedule-decline',
      () => respondToReschedule(job.id, requestId, by, accept),
      (u) => accept && u.scheduledAt ? `Moved to ${format(new Date(u.scheduledAt), 'EEE d MMM, h:mm a')}. Your calendar is updated.` : 'The original time stands.'
    ),
    cancel: (reason: string) => run('cancel', () => cancelJob(job.id, by, reason), `Job #${job.id} cancelled. ${job.customerName} has been told and the slot is free.`)
  };
}
