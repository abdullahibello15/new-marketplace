import { format, parseISO } from 'date-fns';
import { TIME_WINDOWS } from '../constants';
import type { Job, TimeWindow } from '../types';

export function timeWindowLabel(id: TimeWindow): string {
  return TIME_WINDOWS.find((w) => w.id === id)?.label ?? 'Any time';
}

/** "Tue 7 Oct · Morning (8am – 12pm)" — what the customer asked for. */
export function preferredTimeText(job: Pick<Job, 'preferredDate' | 'timeWindow'>): string {
  return `${format(parseISO(job.preferredDate), 'EEE d MMM')} · ${timeWindowLabel(job.timeWindow)}`;
}

/** The booked time once scheduled, otherwise the customer's preference. */
export function jobWhenText(job: Pick<Job, 'scheduledAt' | 'preferredDate' | 'timeWindow'>): string {
  return job.scheduledAt ? format(new Date(job.scheduledAt), 'EEE d MMM, h:mm a') : preferredTimeText(job);
}
