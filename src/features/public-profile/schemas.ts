import { addDays, format, isAfter, isBefore, parseISO, startOfToday } from 'date-fns';
import { z } from 'zod';
import { weekdays } from '../../data/weekdays';
import { sanitizeText } from '../../lib/sanitize';
import { formatClock, toMinutes, weekdayOfDate } from '../../utils/workingHours';
import { BOOKING_MESSAGE_MAX, BOOKING_MESSAGE_MIN, BOOKING_WINDOW_DAYS } from './constants';
import type { WorkingHours } from '../../types/marketplace';
import type { BookableItem } from './types';

interface BookingRules {
  items: BookableItem[];
  workingHours: WorkingHours;
  vendorName: string;
  now?: Date;
}

/**
 * Booking/request form rules. Built per vendor because a valid date and time depend on their working
 * hours: no closed days, no times outside opening hours, nothing in the past.
 */
export function makeBookingSchema({ items, workingHours, vendorName, now = new Date() }: BookingRules) {
  const today = startOfToday();
  const lastDay = addDays(today, BOOKING_WINDOW_DAYS);

  return z.
  object({
    itemId: z.string().refine((id) => items.some((i) => i.id === id), 'Choose what you need.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
    message: z.
    string().
    transform(sanitizeText).
    pipe(
      z.
      string().
      min(BOOKING_MESSAGE_MIN, `Tell ${vendorName} a little more (at least ${BOOKING_MESSAGE_MIN} characters).`).
      max(BOOKING_MESSAGE_MAX, `Keep it to ${BOOKING_MESSAGE_MAX} characters.`)
    )
  }).
  superRefine((v, ctx) => {
    const day = parseISO(v.date);
    if (Number.isNaN(day.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: 'Choose a date.' });
      return;
    }
    if (isBefore(day, today)) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: 'Choose today or a later date.' });
      return;
    }
    if (isAfter(day, lastDay)) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: `Choose a date in the next ${BOOKING_WINDOW_DAYS} days.` });
      return;
    }
    const weekday = weekdayOfDate(day);
    const hours = workingHours[weekday];
    if (!hours.open) {
      const dayName = weekdays.find((w) => w.id === weekday)?.label ?? 'that day';
      ctx.addIssue({ code: 'custom', path: ['date'], message: `${vendorName} is closed on ${dayName}s. Please pick another day.` });
      return;
    }
    const minutes = toMinutes(v.time);
    if (minutes < toMinutes(hours.opensAt) || minutes >= toMinutes(hours.closesAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['time'],
        message: `Choose a time between ${formatClock(hours.opensAt)} and ${formatClock(hours.closesAt)}.`
      });
      return;
    }
    if (v.date === format(now, 'yyyy-MM-dd') && minutes <= now.getHours() * 60 + now.getMinutes()) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: 'That time has already passed. Choose a later time.' });
    }
  });
}

export type BookingFormValues = z.input<ReturnType<typeof makeBookingSchema>>;
export type BookingFormData = z.output<ReturnType<typeof makeBookingSchema>>;
