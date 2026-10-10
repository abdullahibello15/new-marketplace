import { useTranslation } from 'react-i18next';
import { useId, useState } from 'react';
import { MapPinCheckIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { JOB_ACTOR, JOB_STATUS, START_JOB_EARLY_MINUTES } from '../../../jobs/constants';
import { transitionBlockedReason } from '../../../jobs/stateMachine';
import type { Job } from '../../../jobs/types';

interface StartJobCardProps {
  job: Job;
  busy: boolean;
  onStart: (shareLocation: boolean) => Promise<boolean>;
}

/**
 * Task 54: "I've arrived / Start job". Enabled from START_JOB_EARLY_MINUTES before the booked time (the
 * state machine's guard says when); asks before sharing the vendor's location with the customer.
 */
export function StartJobCard({ job, busy, onStart }: StartJobCardProps) {
  const { t } = useTranslation('vendor');
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const blocked = transitionBlockedReason(job, JOB_STATUS.InProgress, JOB_ACTOR.Vendor);

  return (
    <section aria-labelledby={`${uid}-heading`} className="rounded-2xl border border-pine/40 bg-white p-4 lg:p-5">
      <h2 id={`${uid}-heading`} className="text-base font-bold text-ink">{t('start.title')}</h2>
      <p className="mt-0.5 text-sm text-muted">{t('start.text', { minutes: START_JOB_EARLY_MINUTES })}</p>
      <Button icon={MapPinCheckIcon} fullWidth className="mt-3" disabled={blocked !== null} aria-describedby={blocked ? `${uid}-blocked` : undefined} onClick={() => setOpen(true)}>
        {t('start.button')}
      </Button>
      {blocked &&
      <p id={`${uid}-blocked`} className="mt-2 text-sm text-muted">
          {blocked}
        </p>
      }

      <Dialog open={open} onClose={() => setOpen(false)} dismissible={!busy} title={t('start.dialogTitle')} description={t('start.dialogText', { name: job.customerName })}>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm">
          <input type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} className="mt-0.5 h-4 w-4 accent-pine" />
          <span>
            <span className="block font-semibold text-ink">{t('start.share')}</span>
            <span className="block text-muted">{t('start.shareText', { place: job.address.placeLabel })}</span>
          </span>
        </label>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            {t('start.notYet')}
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              if (await onStart(shareLocation)) setOpen(false);
            }}>

            {t('start.confirm')}
          </Button>
        </div>
      </Dialog>
    </section>);

}
