import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ApiError } from '../../../services/mockApi';
import { getJob } from '../services/jobService';
import type { Job } from '../types';

/** One job. A 404 becomes `notFound`; `replace` swaps in the updated job after an action. */
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
  return { job: data, notFound: status === 'success' && data === null, status, error, reload, replace };
}
