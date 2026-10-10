import { parseISO } from 'date-fns';
import { TIME_WINDOWS } from '../constants';
import { timeWindowLabel as translatedWindow } from '../../../i18n/labels';
import { formatDate } from '../../../utils/format';
import type { Job, TimeWindow } from '../types';

export function timeWindowLabel(id: TimeWindow): string {
  const window = TIME_WINDOWS.find((w) => w.id === id);
  return window ? translatedWindow(id, window.label) : translatedWindow('fallback', 'Any time');
}

/** "Tue 7 Oct · Morning (8am – 12pm)" — what the customer asked for. */
export function preferredTimeText(job: Pick<Job, 'preferredDate' | 'timeWindow'>): string {
  return `${formatDate(parseISO(job.preferredDate), 'EEE d MMM')} · ${timeWindowLabel(job.timeWindow)}`;
}

/** The booked time once scheduled, otherwise the customer's preference. */
export function jobWhenText(job: Pick<Job, 'scheduledAt' | 'preferredDate' | 'timeWindow'>): string {
  return job.scheduledAt ? formatDate(job.scheduledAt, 'EEE d MMM, h:mm a') : preferredTimeText(job);
}
