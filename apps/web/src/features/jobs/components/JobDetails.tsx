import { useTranslation } from 'react-i18next';
import { CalendarClockIcon, MapPinIcon, WrenchIcon } from 'lucide-react';
import { lgaLabel } from '../../../i18n/labels';
import { preferredTimeText } from '../utils/jobText';
import { JobPhotos } from './JobPhotos';
import type { Job } from '../types';

/** What the customer asked for: description, photos, preferred time and address. Used by both apps. */
export function JobDetails({ job }: {job: Job;}) {
  const { t } = useTranslation('jobs');
  return (
    <section aria-labelledby="job-details-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="job-details-heading" className="text-base font-bold text-ink">{t('details.title')}</h2>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{job.description}</p>

      <ul className="mt-4 space-y-2 text-sm text-muted">
        {job.serviceName &&
        <li className="flex items-start gap-2">
            <WrenchIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="sr-only">{t('details.service')}</span>
              {job.serviceName}
            </span>
          </li>
        }
        <li className="flex items-start gap-2">
          <CalendarClockIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">{t('details.preferred')}</span> {preferredTimeText(job)}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="text-ink">{job.address.landmark}</span>
            <br />
            {job.address.placeLabel} · {t('details.lga', { lga: lgaLabel(job.address.lga) })}
          </span>
        </li>
      </ul>

      <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">{t('details.photos')}</h3>
      <div className="mt-2">
        <JobPhotos photos={job.photos} label={t('details.photoLabel', { id: job.id })} />
      </div>
    </section>);

}
