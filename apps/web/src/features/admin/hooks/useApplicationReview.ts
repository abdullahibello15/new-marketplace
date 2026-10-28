import { useCallback, useEffect, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import {
  approveApplication,
  claimApplication,
  getApplication,
  rejectApplication,
  releaseApplication,
  requestMoreInfo,
  revealIdNumber,
  saveReview } from
'../services/verificationService';
import type { DocumentChecks, DocumentType, VerificationApplication } from '../types';

const EMPTY_CHECKS: DocumentChecks = { legible: null, notExpired: null, nameMatches: null };
type Busy = 'claim' | 'release' | 'save' | 'approve' | 'reject' | 'info' | `reveal:${string}` | null;

/** One application under review: claim, checklist and notes (saved as you go), reveal, and the three decisions. */
export function useApplicationReview(id: string) {
  const toast = useToast();
  const load = useCallback(() => getApplication(id), [id]);
  const app = useAsyncData(load);
  const [busy, setBusy] = useState<Busy>(null);
  const [notes, setNotes] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const loaded = app.data;

  useEffect(() => {
    if (loaded) setNotes(loaded.notes);
  }, [loaded?.id, loaded?.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(kind: Busy, task: () => Promise<VerificationApplication>, success?: string): Promise<boolean> {
    setBusy(kind);
    try {
      const next = await task();
      app.setData(() => next);
      if (success) toast.success(success);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      // Someone else may have claimed or decided it meanwhile: show the latest.
      app.reload();
      return false;
    } finally {
      setBusy(null);
    }
  }

  const checksFor = (docId: string) => loaded?.checks[docId] ?? EMPTY_CHECKS;

  return {
    ...app,
    busy,
    notes,
    setNotes,
    revealed,
    checksFor,
    claim: (takeOver: boolean) => run('claim', () => claimApplication(id, { takeOver }), takeOver ? 'You’ve taken over this application.' : 'Claimed. It’s yours for 30 minutes.'),
    release: () => run('release', () => releaseApplication(id), 'Released back to the queue.'),
    setChecks: (docId: string, checks: DocumentChecks) =>
    loaded && run('save', () => saveReview(id, { checks: { ...loaded.checks, [docId]: checks }, notes })),
    saveNotes: () => loaded && run('save', () => saveReview(id, { checks: loaded.checks, notes }), 'Notes saved.'),
    reveal: async (docId: string) => {
      setBusy(`reveal:${docId}`);
      try {
        const full = await revealIdNumber(id, docId);
        setRevealed((r) => ({ ...r, [docId]: full }));
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(null);
      }
    },
    approve: () => run('approve', () => approveApplication(id), 'Approved. The vendor’s badge is updated everywhere.'),
    reject: (reason: string) => run('reject', () => rejectApplication(id, reason), 'Rejected. The vendor has been told why.'),
    requestInfo: (message: string, documents: DocumentType[]) => run('info', () => requestMoreInfo(id, message, documents), 'Request sent to the vendor.')
  };
}
