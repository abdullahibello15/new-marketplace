import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { addInternalNote, getDispute, messageParties, requestEvidence, resolveDisputeCase, takeDispute } from '../services/disputeService';
import type { DisputeOutcome, JobParty } from '../../jobs/types';

type Busy = 'take' | 'message' | 'evidence' | 'note' | 'resolve' | null;

/** One dispute: the read-only thread and evidence, and the mediator's actions (each reloads the case). */
export function useDisputeWorkspace(id: string) {
  const toast = useToast();
  const load = useCallback(() => getDispute(id), [id]);
  const detail = useAsyncData(load);
  const [busy, setBusy] = useState<Busy>(null);
  const [version, setVersion] = useState(0);

  async function run(kind: Busy, task: () => Promise<void>, success: string): Promise<boolean> {
    setBusy(kind);
    try {
      await task();
      toast.success(success);
      detail.reload();
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return {
    ...detail,
    busy,
    /** Changes after every action (for the audit trail to reload). */
    version,
    take: () => run('take', () => takeDispute(id), 'You’re now mediating this dispute.'),
    message: (to: 'customer' | 'vendor' | 'both', body: string) => run('message', () => messageParties(id, to, body), 'Message sent.'),
    requestEvidence: (party: JobParty, body: string) => run('evidence', () => requestEvidence(id, party, body), 'Evidence requested. Their 48-hour countdown has started.'),
    addNote: (body: string) => run('note', () => addInternalNote(id, body), 'Note added (staff only).'),
    resolve: (outcome: DisputeOutcome, reason: string, refundAmount?: number) =>
    run('resolve', () => resolveDisputeCase(id, outcome, { reason, refundAmount }), 'Dispute resolved. Escrow is settled and both parties have been told.')
  };
}
