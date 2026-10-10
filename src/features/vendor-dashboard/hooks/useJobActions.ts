import { useState } from 'react';
import i18n from '../../../i18n';
import { formatDate } from '../../../utils/format';
import { AUTO_CONFIRM_HOURS, JOB_ACTOR } from '../../jobs/constants';
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
    sendQuote: (input: QuoteInput) => run('quote', () => sendQuote(job.id, input), () => i18n.t('vendor:toast.quoteSent', { name: job.customerName })),
    decline: (reason: string) => run('decline', () => declineJob(job.id, reason), () => i18n.t('vendor:toast.declined', { name: job.customerName })),
    start: (shareLocation: boolean) =>
    run('start', () => startJob(job.id, { shareLocation }), (u) => i18n.t('vendor:toast.started', { time: formatDate(u.arrival?.at ?? Date.now(), 'h:mm a'), name: job.customerName })),
    markDone: () => run('done', () => markWorkDone(job.id), () => i18n.t('vendor:toast.done', { name: job.customerName, hours: AUTO_CONFIRM_HOURS })),
    requestReschedule: (data: {proposedStart: string;reason: string;}) =>
    run('reschedule-request', () => requestReschedule(job.id, by, data), () => i18n.t('vendor:toast.rescheduleSent', { name: job.customerName })),
    respondReschedule: (requestId: string, accept: boolean) =>
    run(
      accept ? 'reschedule-accept' : 'reschedule-decline',
      () => respondToReschedule(job.id, requestId, by, accept),
      (u) => accept && u.scheduledAt ? i18n.t('vendor:toast.moved', { date: formatDate(u.scheduledAt, 'EEE d MMM, h:mm a') }) : i18n.t('jobs:toast.originalStands')
    ),
    cancel: (reason: string) => run('cancel', () => cancelJob(job.id, by, reason), () => i18n.t('vendor:toast.cancelled', { id: job.id, name: job.customerName }))
  };
}
