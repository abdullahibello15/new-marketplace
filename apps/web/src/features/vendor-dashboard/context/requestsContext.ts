import { createContext } from 'react';
import type { AsyncStatus } from '../../../hooks/useAsyncData';
import type { Job } from '../../jobs/types';

export interface RequestsContextValue {
  /** Every job sent to this vendor, from the shared job service. */
  jobs: Job[];
  status: AsyncStatus;
  error: string | null;
  reload: () => void;
  /** Swap in a job returned by an action (quote, decline) without refetching. */
  replaceJob: (job: Job) => void;
  /** Requests still waiting for a quote; shown as the nav badge. */
  newCount: number;
}

export const RequestsContext = createContext<RequestsContextValue | null>(null);
