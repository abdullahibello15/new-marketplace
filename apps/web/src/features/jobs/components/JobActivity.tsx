import { useTranslation } from 'react-i18next';
import { JobStatusHistory } from './JobStatusHistory';
import type { Job, JobActor } from '../types';

/** "Activity" card wrapping the status history. */
export function JobActivity({ job, viewer }: {job: Job;viewer: Exclude<JobActor, 'system'>;}) {
  const { t } = useTranslation('jobs');
  return (
    <section aria-labelledby="activity-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="activity-heading" className="text-base font-bold text-ink">{t('activity.title')}</h2>
      <div className="mt-3">
        <JobStatusHistory job={job} viewer={viewer} />
      </div>
    </section>);

}
