import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { AUTO_CONFIRM_HOURS } from '../../../jobs/constants';
import type { Job } from '../../../jobs/types';

/** Task 55 (vendor side): "Mark work done" hands the job to the customer to confirm. */
export function MarkDoneCard({ job, busy, onDone }: {job: Job;busy: boolean;onDone: () => Promise<boolean>;}) {
  const { t } = useTranslation('vendor');
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="mark-done-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="mark-done-heading" className="text-base font-bold text-ink">{t('markDone.title')}</h2>
      <p className="mt-0.5 text-sm text-muted">{t('markDone.text', { name: job.customerName, hours: AUTO_CONFIRM_HOURS })}</p>
      <Button icon={CheckCircle2Icon} fullWidth className="mt-3" onClick={() => setOpen(true)}>
        {t('markDone.button')}
      </Button>
      <ConfirmDialog
        open={open}
        title={t('markDone.dialogTitle')}
        description={t('markDone.dialogText')}
        confirmLabel={t('markDone.confirm')}
        loading={busy}
        onConfirm={async () => {
          if (await onDone()) setOpen(false);
        }}
        onCancel={() => setOpen(false)} />

    </section>);

}
