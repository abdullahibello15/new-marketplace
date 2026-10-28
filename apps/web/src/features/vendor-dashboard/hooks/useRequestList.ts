import { useMemo, useState } from 'react';
import { normalizeSearch } from '../../../lib/sanitize';
import { JOB_STATUS, JOB_STATUS_ORDER } from '../../jobs/constants';
import type { Job, JobStatus, JobStatusFilter } from '../../jobs/types';

/** New requests first (they need a quote), then everything else most recently updated first. */
function byPriority(a: Job, b: Job): number {
  const aNew = a.status === JOB_STATUS.Requested ? 0 : 1;
  const bNew = b.status === JOB_STATUS.Requested ? 0 : 1;
  return aNew - bNew || b.updatedAt.localeCompare(a.updatedAt);
}

/** Search by customer name and filter by job status. */
export function useRequestList(jobs: Job[]) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(JOB_STATUS_ORDER.map((s) => [s, 0])) as Record<JobStatus, number>;
    for (const j of jobs) byStatus[j.status] += 1;
    return { all: jobs.length, ...byStatus } satisfies Record<JobStatusFilter, number>;
  }, [jobs]);

  const results = useMemo(() => {
    const q = normalizeSearch(query);
    return jobs.
    filter((j) => statusFilter === 'all' || j.status === statusFilter).
    filter((j) => !q || j.customerName.toLowerCase().includes(q)).
    sort(byPriority);
  }, [jobs, query, statusFilter]);

  const hasFilters = Boolean(query.trim()) || statusFilter !== 'all';

  function clearFilters() {
    setQuery('');
    setStatusFilter('all');
  }

  return { query, setQuery, statusFilter, setStatusFilter, counts, results, hasFilters, clearFilters };
}
