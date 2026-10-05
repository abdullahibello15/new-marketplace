import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { declineJob, sendQuote } from '../../jobs/services/jobService';
import { useRequests } from './useRequests';
import type { Job, QuoteInput } from '../../jobs/types';

type Dialog = 'quote' | 'decline' | null;

/** Vendor actions on a new request: send a quote (→ Quoted) or decline it (→ Declined). */
export function useJobActions(job: Job) {
  const { replaceJob } = useRequests();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);

  async function run(action: () => Promise<Job>, success: string): Promise<boolean> {
    try {
      replaceJob(await action());
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  return {
    dialog,
    openQuote: () => setDialog('quote'),
    openDecline: () => setDialog('decline'),
    close: () => setDialog(null),
    sendQuote: (input: QuoteInput) => run(() => sendQuote(job.id, input), `Quote sent to ${job.customerName}.`),
    decline: (reason: string) => run(() => declineJob(job.id, reason), `Declined ${job.customerName}’s request.`)
  };
}
