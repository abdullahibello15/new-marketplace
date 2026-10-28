import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../../utils/format';
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
  const { t } = useTranslation('jobs');
  const [dialog, setDialog] = useState<'confirm' | 'report' | null>(null);
  const deadline = autoConfirmAt(job);

  return (
    <section aria-labelledby="confirm-heading" className="rounded-2xl border border-[#8A4B00]/40 bg-[#FFF4E5] p-4 lg:p-5">
      <h2 id="confirm-heading" className="text-base font-bold text-ink">{t('confirm.title')}</h2>
      <p className="mt-1 text-sm text-ink">
        {t('confirm.text', { name: job.vendorName })}
      </p>
      {deadline &&
      <p className="mt-2 text-xs font-semibold text-[#8A4B00]">
          {t('confirm.auto', { date: formatDate(deadline, 'EEE d MMM, h:mm a'), hours: AUTO_CONFIRM_HOURS })}
        </p>
      }
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" icon={TriangleAlertIcon} onClick={() => setDialog('report')} disabled={busy !== null}>
          {t('confirm.report')}
        </Button>
        <Button icon={CheckCircle2Icon} onClick={() => setDialog('confirm')} loading={busy === 'confirm'}>
          {t('confirm.confirm')}
        </Button>
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        title={t('confirm.dialogTitle')}
        description={t('confirm.dialogText', { name: job.vendorName, id: job.id })}
        confirmLabel={t('confirm.dialogConfirm')}
        loading={busy === 'confirm'}
        onConfirm={async () => {
          if (await onConfirm()) setDialog(null);
        }}
        onCancel={() => setDialog(null)} />

      <ReportProblemDialog open={dialog === 'report'} vendorName={job.vendorName} onSubmit={onReport} onClose={() => setDialog(null)} />
    </section>);

}
