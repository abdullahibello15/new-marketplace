import { useTranslation } from 'react-i18next';
import { StatusSteps, type StatusStep } from '../../../components/ui/StatusSteps';
import { jobStatusLabel } from '../../../i18n/labels';
import { JOB_MAIN_PATH, JOB_SIDE_BRANCHES, JOB_STATUS_META } from '../constants';
import { lastMainPathStatus } from '../stateMachine';
import { RescheduleHistory } from './reschedule/RescheduleHistory';
import type { Job, JobStatus } from '../types';

/** Main path up to where the job is (or where it left the path), then the side-branch end if there is one. */
function buildSteps(job: Pick<Job, 'status' | 'history'>): StatusStep[] {
  const reachedAt = (s: JobStatus) => [...job.history].reverse().find((h) => h.status === s)?.at ?? null;
  const branched = JOB_SIDE_BRANCHES.includes(job.status);
  const lastOnPath = branched ? lastMainPathStatus(job) : job.status;
  const lastIndex = JOB_MAIN_PATH.indexOf(lastOnPath);

  const path: StatusStep[] = JOB_MAIN_PATH.map((status, i) => ({
    key: status,
    label: jobStatusLabel(status, JOB_STATUS_META[status].label),
    at: i <= lastIndex ? reachedAt(status) : null,
    state: i < lastIndex || i === lastIndex && branched ? 'done' : i === lastIndex ? 'current' : 'upcoming'
  }));
  if (!branched) return path;
  // Show the steps it did reach, then where it stopped; the rest of the path no longer applies.
  return [...path.slice(0, lastIndex + 1), { key: job.status, label: jobStatusLabel(job.status, JOB_STATUS_META[job.status].label), state: 'stopped', at: reachedAt(job.status) }];
}

/**
 * The job's progress: Requested → … → Closed, with the current step highlighted. Vertical on phones,
 * horizontal from tablet up. Shared by the customer's job page and the vendor's request page.
 */
export function JobTimeline({ job }: {job: Pick<Job, 'status' | 'history' | 'reschedules' | 'customerName' | 'vendorName'>;}) {
  const { t } = useTranslation('jobs');
  return (
    <>
      <StatusSteps steps={buildSteps(job)} label={t('timeline.label')} stoppedText={t('timeline.stopped')} />
      <RescheduleHistory job={job} />
    </>);

}
