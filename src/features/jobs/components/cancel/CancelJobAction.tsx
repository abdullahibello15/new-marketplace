import { useState } from 'react';
import { XCircleIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatNaira } from '../../../../utils/format';
import { CANCEL_REASONS, getCancellationTerms, type CancellationTerms } from '../../cancellationPolicy';
import { JOB_ACTOR } from '../../constants';
import { ReasonDialog } from '../ReasonDialog';
import { CancellationTermsSummary } from './CancellationTermsSummary';
import type { Job, JobParty } from '../../types';

interface CancelJobActionProps {
  job: Job;
  actor: JobParty;
  busy: boolean;
  /** Resolves true when the job was cancelled. */
  onCancel: (reason: string) => Promise<boolean>;
}

/**
 * "Cancel job" for either side. Two steps: the terms that apply plus a reason (preset list or Other),
 * then a final confirmation. Renders nothing when the policy doesn't allow this person to cancel now.
 */
export function CancelJobAction({ job, actor, busy, onCancel }: CancelJobActionProps) {
  const [step, setStep] = useState<'reason' | 'confirm' | null>(null);
  // Terms are worked out when the dialog opens, so a late-cancellation fee reflects the time it's used.
  const [terms, setTerms] = useState<CancellationTerms>(() => getCancellationTerms(job, actor));
  const [reason, setReason] = useState('');
  const current = getCancellationTerms(job, actor);
  if (!current.allowed) return null;

  const otherParty = actor === JOB_ACTOR.Customer ? job.vendorName : job.customerName;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        icon={XCircleIcon}
        onClick={() => {
          setTerms(getCancellationTerms(job, actor));
          setStep('reason');
        }}
        className="text-clay-dark hover:bg-clay-soft hover:text-clay-dark">

        Cancel job
      </Button>

      <ReasonDialog
        open={step === 'reason'}
        title={`Cancel job #${job.id}?`}
        description={`${otherParty} will be told it’s cancelled and why.`}
        reasonLabel="Why are you cancelling?"
        placeholder="Add any detail that helps"
        presets={CANCEL_REASONS[actor]}
        required={terms.reasonRequired}
        confirmLabel="Continue"
        onConfirm={async (r) => {
          setReason(r);
          setStep('confirm');
          // false: don’t let the reason dialog reset the step; the confirm dialog takes over from here.
          return false;
        }}
        onCancel={() => setStep(null)}>

        <CancellationTermsSummary terms={terms} />
      </ReasonDialog>

      <ConfirmDialog
        open={step === 'confirm'}
        title="Cancel this job for good?"
        description={
        <>
            Job #{job.id} will be cancelled{terms.fee > 0 ? ` with a ${formatNaira(terms.fee)} late-cancellation fee (demo only, not charged)` : ' at no cost'}.
            {reason && <> Reason: “{reason}”.</>} You can’t undo this.
          </>
        }
        confirmLabel="Yes, cancel job"
        cancelLabel="Keep job"
        destructive
        loading={busy}
        onConfirm={async () => {
          if (await onCancel(reason)) setStep(null);
        }}
        onCancel={() => setStep(null)} />

    </div>);

}
