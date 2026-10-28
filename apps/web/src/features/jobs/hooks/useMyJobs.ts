import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { JOB_STATUS_ORDER } from '../constants';
import { listCustomerJobs } from '../services/jobService';
import type { JobStatus, JobStatusFilter } from '../types';

const STATUS_PARAM = 'status';
const isStatus = (v: string | null): v is JobStatus => JOB_STATUS_ORDER.some((s) => s === v);

/** The customer's jobs plus a status filter kept in the URL (?status=quoted), so Back and links work. */
export function useMyJobs() {
  const { data, status, error, reload } = useAsyncData(listCustomerJobs);
  const [params, setParams] = useSearchParams();
  const raw = params.get(STATUS_PARAM);
  const filter: JobStatusFilter = isStatus(raw) ? raw : 'all';
  const jobs = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(JOB_STATUS_ORDER.map((s) => [s, 0])) as Record<JobStatus, number>;
    jobs.forEach((j) => byStatus[j.status] += 1);
    return byStatus;
  }, [jobs]);

  const visible = useMemo(() => filter === 'all' ? jobs : jobs.filter((j) => j.status === filter), [jobs, filter]);

  function setFilter(next: JobStatusFilter) {
    setParams(next === 'all' ? {} : { [STATUS_PARAM]: next }, { replace: true });
  }

  return { jobs, visible, counts, filter, setFilter, status, error, reload };
}
