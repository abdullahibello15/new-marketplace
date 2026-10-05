import { useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { acceptQuote, rejectQuote } from '../services/jobService';
import type { Job } from '../types';

type Pending = 'accept' | 'reject' | null;

/** Customer accepting or rejecting a quote, each behind a confirmation. Resolves true on success. */
export function useQuoteResponse(job: Job, onUpdated: (job: Job) => void) {
  const toast = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const [accepting, setAccepting] = useState(false);

  async function confirmAccept() {
    setAccepting(true);
    try {
      const updated = await acceptQuote(job.id);
      onUpdated(updated);
      setPending(null);
      toast.success(`Booked for ${updated.scheduledAt ? format(new Date(updated.scheduledAt), 'EEE d MMM, h:mm a') : 'the agreed time'}.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAccepting(false);
    }
  }

  async function confirmReject(reason: string): Promise<boolean> {
    try {
      onUpdated(await rejectQuote(job.id, reason));
      toast.success(`You turned down ${job.vendorName}’s quote.`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  return {
    pending,
    accepting,
    askAccept: () => setPending('accept'),
    askReject: () => setPending('reject'),
    cancel: () => setPending(null),
    confirmAccept,
    confirmReject
  };
}
