import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { jobs as seedJobs } from '../data/jobs';
import type { Job, NewJobInput } from '../types/marketplace';

interface JobsContextValue {
  jobs: Job[];
  getJob: (id: string) => Job | undefined;
  addJob: (input: NewJobInput) => Job;
}

const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: {children: React.ReactNode;}) {
  const [jobs, setJobs] = useState<Job[]>(seedJobs);

  const getJob = useCallback((id: string) => jobs.find((j) => j.id === id), [jobs]);

  const addJob = useCallback(
    (input: NewJobInput) => {
      const nextId = String(Math.max(...jobs.map((j) => Number(j.id))) + 1);
      const job: Job = {
        ...input,
        id: nextId,
        stage: 'requested',
        quote: null,
        createdAt: new Date().toISOString()
      };
      setJobs((prev) => [job, ...prev]);
      return job;
    },
    [jobs]
  );

  const value = useMemo(() => ({ jobs, getJob, addJob }), [jobs, getJob, addJob]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs(): JobsContextValue {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobs must be used within JobsProvider');
  return ctx;
}