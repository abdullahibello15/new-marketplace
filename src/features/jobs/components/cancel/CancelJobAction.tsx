import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { XCircleIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { cancelReasonLabel } from '../../../../i18n/labels';
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
  const { t } = useTranslation('jobs');
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

        {t('cancel.button')}
      </Button>

      <ReasonDialog
        open={step === 'reason'}
        title={t('cancel.title', { id: job.id })}
        description={t('cancel.text', { name: otherParty })}
        reasonLabel={t('cancel.reasonLabel')}
        placeholder={t('cancel.placeholder')}
        presets={CANCEL_REASONS[actor].map((p) => ({ id: p.id, label: cancelReasonLabel(actor, p.id, p.label) }))}
        required={terms.reasonRequired}
        confirmLabel={t('cancel.continue')}
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
        title={t('cancel.confirmTitle')}
        description={
        <>
            {terms.fee > 0 ? t('cancel.confirmFee', { id: job.id, fee: formatNaira(terms.fee) }) : t('cancel.confirmFree', { id: job.id })}
            {reason && <> {t('cancel.reasonLine', { reason })}</>} {t('cancel.noUndo')}
          </>
        }
        confirmLabel={t('cancel.confirm')}
        cancelLabel={t('cancel.keep')}
        destructive
        loading={busy}
        onConfirm={async () => {
          if (await onCancel(reason)) setStep(null);
        }}
        onCancel={() => setStep(null)} />

    </div>);

}
