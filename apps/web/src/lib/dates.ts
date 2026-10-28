import { format, parseISO } from 'date-fns';
import { formatDay, formatTime } from '../utils/format';

/** Local calendar date as "yyyy-MM-dd", the key used for day-based lookups and APIs. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parses a "yyyy-MM-dd" key as local midnight. */
export function fromDateKey(key: string): Date {
  return parseISO(key);
}

export function isDateKey(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/** "Today, 2:00 PM" or "Tue, 7 Oct, 10:00 AM". */
export function formatDateTime(iso: string): string {
  return `${formatDay(iso)}, ${formatTime(iso)}`;
}
