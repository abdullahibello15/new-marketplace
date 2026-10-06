import { GavelIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
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
  const d = useDisputeResolution(job, onUpdated);
  if (!ESCROW_CONFIG.showAdminDemoActions || job.status !== JOB_STATUS.Disputed) return null;

  return (
    <section aria-labelledby="admin-demo-heading" className="rounded-2xl border border-dashed border-mustard bg-[#FBF3DC]/60 p-4">
      <h2 id="admin-demo-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
        <GavelIcon className="h-4 w-4" aria-hidden="true" />
        Demo · Gwani admin: resolve this dispute
      </h2>
      <p className="mt-1 text-xs text-muted">Stands in for the review team’s tool. Each choice settles the escrowed money.</p>
      <div className="mt-3 grid gap-2">
        {OUTCOMES.map((o) =>
        <Button key={o} variant="outline" size="sm" loading={d.busy === o} disabled={d.busy !== null} onClick={() => d.ask(o)}>
            {DISPUTE_OUTCOME_LABELS[o]}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={d.confirming !== null}
        title={d.confirming ? DISPUTE_OUTCOME_LABELS[d.confirming] : ''}
        description={
        d.confirming ?
        `Refund to ${job.customerName}: ${formatNaira(d.refundFor(d.confirming))}. The rest of the held money is released to ${job.vendorName}, less commission. This can’t be undone.` :
        undefined
        }
        confirmLabel="Resolve dispute"
        cancelLabel="Go back"
        loading={d.busy !== null}
        onConfirm={() => void d.resolve()}
        onCancel={d.cancel} />

    </section>);

}
