import { useTranslation } from 'react-i18next';
import { GavelIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { disputeOutcomeLabel } from '../../../../i18n/labels';
import { formatNaira } from '../../../../utils/format';
import { DISPUTE_OUTCOME, DISPUTE_OUTCOME_LABELS, JOB_STATUS } from '../../../jobs/constants';
import { ESCROW_CONFIG } from '../../escrow/escrowConfig';
import { useDisputeResolution } from '../../hooks/useDisputeResolution';
import type { DisputeOutcome, Job } from '../../../jobs/types';

const OUTCOMES: DisputeOutcome[] = [DISPUTE_OUTCOME.ReleaseToVendor, DISPUTE_OUTCOME.Split, DISPUTE_OUTCOME.RefundCustomer];

/**
 * MOCK "Gwani admin" panel on a disputed job, so the escrow outcomes can be tried. In production this
 * lives in the internal admin tool, not in the customer or vendor app. Hidden when showAdminDemoActions is off.
 */
export function DisputeResolutionDemo({ job, onUpdated }: {job: Job;onUpdated: (job: Job) => void;}) {
  const { t } = useTranslation('payments');
  const d = useDisputeResolution(job, onUpdated);
  if (!ESCROW_CONFIG.showAdminDemoActions || job.status !== JOB_STATUS.Disputed) return null;

  return (
    <section aria-labelledby="admin-demo-heading" className="rounded-2xl border border-dashed border-mustard bg-[#FBF3DC]/60 p-4">
      <h2 id="admin-demo-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
        <GavelIcon className="h-4 w-4" aria-hidden="true" />
        {t('dispute.title')}
      </h2>
      <p className="mt-1 text-xs text-muted">{t('dispute.text')}</p>
      <div className="mt-3 grid gap-2">
        {OUTCOMES.map((o) =>
        <Button key={o} variant="outline" size="sm" loading={d.busy === o} disabled={d.busy !== null} onClick={() => d.ask(o)}>
            {disputeOutcomeLabel(o, DISPUTE_OUTCOME_LABELS[o])}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={d.confirming !== null}
        title={d.confirming ? disputeOutcomeLabel(d.confirming, DISPUTE_OUTCOME_LABELS[d.confirming]) : ''}
        description={
        d.confirming ?
        t('dispute.dialogText', { customer: job.customerName, amount: formatNaira(d.refundFor(d.confirming)), vendor: job.vendorName }) :
        undefined
        }
        confirmLabel={t('dispute.resolve')}
        cancelLabel={t('cash.goBack')}
        loading={d.busy !== null}
        onConfirm={() => void d.resolve()}
        onCancel={d.cancel} />

    </section>);

}
