// The date-key helpers moved to packages/domain (@zamani/domain); this path keeps working.
import { formatDay, formatTime } from '../utils/format';
export * from '@zamani/domain/lib/dates';

/** "Today, 2:00 PM" or "Tue, 7 Oct, 10:00 AM". */
export function formatDateTime(iso: string): string {
  return `${formatDay(iso)}, ${formatTime(iso)}`;
}
