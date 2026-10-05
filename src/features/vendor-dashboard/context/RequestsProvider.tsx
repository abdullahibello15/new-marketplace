import React, { useCallback, useMemo } from 'react';
import { vendorAccount } from '../../../data/vendorPortal';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { JOB_STATUS } from '../../jobs/constants';
import { listVendorJobs } from '../../jobs/services/jobService';
import { RequestsContext, type RequestsContextValue } from './requestsContext';
import type { Job } from '../../jobs/types';

const EMPTY: Job[] = [];
const loadVendorJobs = () => listVendorJobs(vendorAccount.vendorId);

/**
 * The vendor's jobs, shared by the requests list, request details, the calendar and the nav badge.
 * They come from the same job service the customer app uses, so a customer's request lands here.
 */
export function RequestsProvider({ children }: {children: React.ReactNode;}) {
  const { data, status, error, reload, setData } = useAsyncData(loadVendorJobs);
  const jobs = data ?? EMPTY;

  const replaceJob = useCallback((job: Job) => setData((prev) => prev.map((j) => j.id === job.id ? job : j)), [setData]);
  const newCount = useMemo(() => jobs.filter((j) => j.status === JOB_STATUS.Requested).length, [jobs]);

  const value = useMemo<RequestsContextValue>(
    () => ({ jobs, status, error, reload, replaceJob, newCount }),
    [jobs, status, error, reload, replaceJob, newCount]
  );

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}
