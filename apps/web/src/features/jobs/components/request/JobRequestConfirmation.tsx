import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon } from 'lucide-react';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { vendorProfilePath } from '../../../public-profile/constants';
import { responseTimeLabel } from '../../../public-profile/utils/profileText';
import { JOB_ROUTES } from '../../constants';
import { preferredTimeText } from '../../utils/jobText';
import { JobStatusBadge } from '../JobStatusBadge';
import type { Vendor } from '../../../../types/marketplace';
import type { Job } from '../../types';

/** Shown after a request is sent. Focus moves to the heading so screen readers announce it. */
export function JobRequestConfirmation({ job, vendor }: {job: Job;vendor: Vendor;}) {
  const { t } = useTranslation('jobs');
  const responds = responseTimeLabel(vendor.responseTimeMinutes);
  return (
    <section aria-labelledby="request-sent-heading" className="rounded-2xl border border-line bg-white p-6 text-center lg:p-8">
      <CheckCircle2Icon className="mx-auto h-12 w-12 text-pine" aria-hidden="true" />
      <h2 id="request-sent-heading" tabIndex={-1} ref={(el) => el?.focus()} className="mt-3 text-xl font-extrabold text-ink focus:outline-none">
        {t('sent.title', { name: vendor.name })}
      </h2>
      <p className="mt-1 text-[15px] text-muted">
        {responds ? t('sent.textWithTime', { time: responds }) : t('sent.text')}
      </p>

      <dl className="mx-auto mt-5 max-w-sm divide-y divide-line rounded-xl border border-line text-left text-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">{t('sent.job')}</dt>
          <dd className="font-bold text-ink">#{job.id}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">{t('sent.status')}</dt>
          <dd>
            <JobStatusBadge status={job.status} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">{t('sent.preferred')}</dt>
          <dd className="text-right font-semibold text-ink">{preferredTimeText(job)}</dd>
        </div>
      </dl>

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
        <Link to={JOB_ROUTES.job(job.id)} className={buttonClasses({ fullWidth: true })}>
          {t('sent.track')}
        </Link>
        <Link to={vendorProfilePath(vendor.id)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
          {t('sent.back', { name: vendor.name })}
        </Link>
      </div>
    </section>);

}
