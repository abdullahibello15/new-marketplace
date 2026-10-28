import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { XCircleIcon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import { JOB_ACTOR } from '../../constants';
import type { Job, JobCancellation, JobParty } from '../../types';
import { APP_NAME } from '../../../../config/brand';

/** Who cancelled, when, why, and any fee. Shown to both sides on a cancelled job. */
export function CancellationNotice({ job, cancellation, viewer }: {job: Job;cancellation: JobCancellation;viewer: JobParty;}) {
  const { t } = useTranslation('jobs');
  const who =
  cancellation.by === viewer ? null : cancellation.by === JOB_ACTOR.Customer ? job.customerName : cancellation.by === JOB_ACTOR.Vendor ? job.vendorName : APP_NAME;
  return (
    <section aria-labelledby="cancelled-heading" className="rounded-2xl border border-line bg-sand p-4 lg:p-5">
      <h2 id="cancelled-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        <XCircleIcon className="h-4 w-4 text-muted" aria-hidden="true" />
        {who === null ? t('cancelled.titleYou') : t('cancelled.title', { who })}
      </h2>
      <p className="mt-1 text-sm text-muted">{formatDate(cancellation.at, 'EEE d MMM yyyy, h:mm a')}</p>
      {cancellation.reason && <p className="mt-2 text-sm text-ink">“{cancellation.reason}”</p>}
      {cancellation.fee > 0 &&
      <p className="mt-2 text-sm text-ink">
          {t('cancelled.fee')} <Price amount={cancellation.fee} className="font-bold" /> <span className="text-muted">{t('cancelled.demo')}</span>
        </p>
      }
    </section>);

}
