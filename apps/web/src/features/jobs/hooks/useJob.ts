import { useCallback, useEffect } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ApiError } from '../../../services/mockApi';
import { JOB_POLL_INTERVAL_MS } from '../constants';
import { getJob } from '../services/jobService';
import type { Job } from '../types';

/**
 * One job. A 404 becomes `notFound`; `replace` swaps in the updated job after an action. While the tab
 * is visible it refetches every JOB_POLL_INTERVAL_MS, so changes the other side makes (the vendor
 * starting the job, a reschedule request) show up without a reload. A real app would use push instead.
 */
export function useJob(jobId: string) {
  const load = useCallback(
    () =>
    getJob(jobId).catch((e: unknown): Job | null => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    [jobId]
  );
  const { data, status, error, reload, setData } = useAsyncData(load);
  const replace = useCallback((job: Job) => setData(() => job), [setData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, JOB_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  return { job: data, notFound: status === 'success' && data === null, status, error, reload, replace };
}
