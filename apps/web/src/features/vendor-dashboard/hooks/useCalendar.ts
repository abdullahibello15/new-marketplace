import { useMemo, useState } from 'react';
import { addDays, endOfWeek, isSameDay, startOfToday, startOfWeek } from 'date-fns';
import { toDateKey } from '../../../lib/dates';
import { CALENDAR_VIEW, WEEK_STARTS_ON } from '../constants';
import { getAvailability, isInPeriod, periodTitle, shiftPeriod, visibleDays } from '../utils/calendar';
import type { BookedJob, CalendarDay, CalendarView } from '../types';
import type { WorkingHours } from '../../../types/marketplace';

interface UseCalendarOptions {
  initialDate?: Date;
  bookingsByDay: Map<string, BookedJob[]>;
  workingHours: WorkingHours;
  blocked: ReadonlySet<string>;
}

const NO_BOOKINGS: BookedJob[] = [];

/**
 * Month/week navigation and the selected day. The selected day drives which period is shown, so
 * arrow-keying past the edge of the grid moves to the next month or week.
 */
export function useCalendar({ initialDate, bookingsByDay, workingHours, blocked }: UseCalendarOptions) {
  const [view, setView] = useState<CalendarView>(CALENDAR_VIEW.Month);
  const [selected, setSelected] = useState<Date>(() => initialDate ?? startOfToday());
  const today = startOfToday();
  const todayKey = toDateKey(today);

  const days = useMemo<CalendarDay[]>(
    () =>
    visibleDays(view, selected).map((date) => {
      const key = toDateKey(date);
      return {
        date,
        key,
        inPeriod: isInPeriod(view, date, selected),
        isToday: key === todayKey,
        // "yyyy-MM-dd" keys sort chronologically as strings.
        isPast: key < todayKey,
        availability: getAvailability(date, workingHours, blocked),
        bookings: bookingsByDay.get(key) ?? NO_BOOKINGS
      };
    }),
    [view, selected, todayKey, workingHours, blocked, bookingsByDay]
  );

  const selectedDay = days.find((d) => isSameDay(d.date, selected)) ?? days[0];

  return {
    view,
    setView,
    days,
    selectedDay,
    title: periodTitle(view, selected),
    select: setSelected,
    previous: () => setSelected((d) => shiftPeriod(view, d, -1)),
    next: () => setSelected((d) => shiftPeriod(view, d, 1)),
    goToToday: () => setSelected(today),
    moveBy: (deltaDays: number) => setSelected((d) => addDays(d, deltaDays)),
    moveToWeekEdge: (edge: 'start' | 'end') =>
    setSelected((d) =>
    edge === 'start' ? startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON }) : endOfWeek(d, { weekStartsOn: WEEK_STARTS_ON })
    )
  };
}
