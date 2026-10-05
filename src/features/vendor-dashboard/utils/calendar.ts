import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek } from
'date-fns';
import { toDateKey } from '../../../lib/dates';
import { BOOKED_JOB_STATUSES } from '../../jobs/constants';
import { CALENDAR_VIEW, DAY_AVAILABILITY, WEEK_STARTS_ON } from '../constants';
import type { Job } from '../../jobs/types';
import type { BookedJob, CalendarView, DayAvailability } from '../types';
import type { Weekday, WorkingHours } from '../../../types/marketplace';

const WEEKDAY_BY_INDEX: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const weekOptions = { weekStartsOn: WEEK_STARTS_ON } as const;

export function weekdayOf(date: Date): Weekday {
  return WEEKDAY_BY_INDEX[date.getDay()];
}

/** A day-off overrides working hours; otherwise the day follows the vendor's weekly schedule. */
export function getAvailability(date: Date, hours: WorkingHours, blocked: ReadonlySet<string>): DayAvailability {
  if (blocked.has(toDateKey(date))) return DAY_AVAILABILITY.Blocked;
  return hours[weekdayOf(date)].open ? DAY_AVAILABILITY.Open : DAY_AVAILABILITY.Closed;
}

/** Days shown in the grid: whole weeks covering the month, or the single week. */
export function visibleDays(view: CalendarView, anchor: Date): Date[] {
  if (view === CALENDAR_VIEW.Week) {
    return eachDayOfInterval({ start: startOfWeek(anchor, weekOptions), end: endOfWeek(anchor, weekOptions) });
  }
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), weekOptions),
    end: endOfWeek(endOfMonth(anchor), weekOptions)
  });
}

export function isInPeriod(view: CalendarView, day: Date, anchor: Date): boolean {
  return view === CALENDAR_VIEW.Week || isSameMonth(day, anchor);
}

export function shiftPeriod(view: CalendarView, anchor: Date, amount: number): Date {
  return view === CALENDAR_VIEW.Week ? addWeeks(anchor, amount) : addMonths(anchor, amount);
}

export function periodTitle(view: CalendarView, anchor: Date): string {
  if (view === CALENDAR_VIEW.Month) return format(anchor, 'MMMM yyyy');
  const start = startOfWeek(anchor, weekOptions);
  const end = endOfWeek(anchor, weekOptions);
  return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
}

/** Jobs with a confirmed slot (Scheduled or later). Requests and open quotes aren't on the calendar yet. */
export function isBooking(job: Job): job is BookedJob {
  return BOOKED_JOB_STATUSES.includes(job.status) && job.scheduledAt !== null;
}

/** Bookings keyed by "yyyy-MM-dd", each day sorted by start time. */
export function groupBookingsByDay(jobs: Job[]): Map<string, BookedJob[]> {
  const byDay = new Map<string, BookedJob[]>();
  for (const job of jobs) {
    if (!isBooking(job)) continue;
    const key = toDateKey(new Date(job.scheduledAt));
    byDay.set(key, [...(byDay.get(key) ?? []), job]);
  }
  byDay.forEach((list) => list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  return byDay;
}
