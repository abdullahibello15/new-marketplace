import { format } from 'date-fns';
import type { DayHours, Weekday, WorkingHours } from '../types/marketplace';

/** Vendors are all in Niger State, so "open now" is judged on West Africa Time, whatever the viewer's clock says. */
const VENDOR_TIME_ZONE = 'Africa/Lagos';

const WEEKDAY_BY_INDEX: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** The working-hours key for a calendar date (in the browser's time zone). */
export function weekdayOfDate(date: Date): Weekday {
  return WEEKDAY_BY_INDEX[date.getDay()];
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** "08:30" → "8:30 AM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return format(new Date(2000, 0, 1, h, m), 'h:mm a');
}

export function formatDayHours(day: DayHours): string {
  return day.open ? `${formatClock(day.opensAt)} – ${formatClock(day.closesAt)}` : 'Closed';
}

export function vendorNow(now = new Date()): {day: Weekday;minutes: number;} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VENDOR_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: get('weekday').slice(0, 3).toLowerCase() as Weekday,
    minutes: Number(get('hour')) * 60 + Number(get('minute'))
  };
}

export function isOpenNow(hours: WorkingHours, now = new Date()): boolean {
  const { day, minutes } = vendorNow(now);
  const today = hours[day];
  return today.open && minutes >= toMinutes(today.opensAt) && minutes < toMinutes(today.closesAt);
}

export function validateDayHours(day: DayHours): string | undefined {
  if (!day.open) return undefined;
  if (!day.opensAt || !day.closesAt) return 'Add an opening and a closing time.';
  if (toMinutes(day.closesAt) <= toMinutes(day.opensAt)) return 'Closing time must be later than opening time.';
  return undefined;
}
