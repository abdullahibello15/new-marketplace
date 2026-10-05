import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { AUTO_CONFIRM_HOURS } from '../../constants';
import { autoConfirmAt } from '../../stateMachine';
import { ReportProblemDialog } from './ReportProblemDialog';
import type { ReportProblemFormData } from '../../schemas';
import type { Job } from '../../types';

interface ConfirmCompletionCardProps {
  job: Job;
  busy: string | null;
  onConfirm: () => Promise<boolean>;
  onReport: (data: ReportProblemFormData) => Promise<boolean>;
}

/** "Awaiting your confirmation": confirm the work, or report a problem instead. */
export function ConfirmCompletionCard({ job, busy, onConfirm, onReport }: ConfirmCompletionCardProps) {
  const [dialog, setDialog] = useState<'confirm' | 'report' | null>(null);
  const deadline = autoConfirmAt(job);

  return (
    <section aria-labelledby="confirm-heading" className="rounded-2xl border border-[#8A4B00]/40 bg-[#FFF4E5] p-4 lg:p-5">
      <h2 id="confirm-heading" className="text-base font-bold text-ink">Awaiting your confirmation</h2>
      <p className="mt-1 text-sm text-ink">
        {job.vendorName} says the work is done. Check it, then confirm, or report a problem if something isn’t right.
      </p>
      {deadline &&
      <p className="mt-2 text-xs font-semibold text-[#8A4B00]">
          If you don’t reply, it’s confirmed automatically on {format(deadline, 'EEE d MMM, h:mm a')} ({AUTO_CONFIRM_HOURS} hours after it was marked done).
        </p>
      }
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" icon={TriangleAlertIcon} onClick={() => setDialog('report')} disabled={busy !== null}>
          Report a problem
        </Button>
        <Button icon={CheckCircle2Icon} onClick={() => setDialog('confirm')} loading={busy === 'confirm'}>
          Confirm completion
        </Button>
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        title="Confirm the job is complete?"
        description={`You’re confirming ${job.vendorName} finished job #${job.id}. You can’t report a problem afterwards.`}
        confirmLabel="Yes, it’s done"
        loading={busy === 'confirm'}
        onConfirm={async () => {
          if (await onConfirm()) setDialog(null);
        }}
        onCancel={() => setDialog(null)} />

      <ReportProblemDialog open={dialog === 'report'} vendorName={job.vendorName} onSubmit={onReport} onClose={() => setDialog(null)} />
    </section>);

}
