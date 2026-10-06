import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { DISPUTE_OUTCOME, DISPUTE_OUTCOME_LABELS } from '../../jobs/constants';
import { resolveDispute } from '../../jobs/services/jobService';
import { ESCROW_CONFIG } from '../escrow/escrowConfig';
import type { DisputeOutcome, Job } from '../../jobs/types';

/** MOCK admin action: resolve a disputed job, which settles its escrow (release, refund or split). */
export function useDisputeResolution(job: Job, onUpdated: (job: Job) => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<DisputeOutcome | null>(null);
  const [confirming, setConfirming] = useState<DisputeOutcome | null>(null);
  const price = job.agreedPrice ?? 0;

  /** What goes back to the customer for each outcome. */
  const refundFor = (outcome: DisputeOutcome) =>
  outcome === DISPUTE_OUTCOME.RefundCustomer ? price : outcome === DISPUTE_OUTCOME.Split ? Math.round(price * ESCROW_CONFIG.demoSplitRefundShare) : 0;

  async function resolve() {
    const outcome = confirming;
    if (!outcome || busy) return;
    setBusy(outcome);
    try {
      onUpdated(await resolveDispute(job.id, outcome, refundFor(outcome)));
      toast.success(`${DISPUTE_OUTCOME_LABELS[outcome]}. Escrow has been settled.`);
      setConfirming(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return { busy, confirming, ask: setConfirming, cancel: () => setConfirming(null), resolve, refundFor };
}
