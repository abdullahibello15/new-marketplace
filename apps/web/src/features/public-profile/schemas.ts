import i18n from '../../i18n';
import { weekdayLabel } from '../../i18n/labels';
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
    itemId: z.string().refine((id) => items.some((i) => i.id === id), { message: i18n.t('discovery:booking.error.chooseItem') }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: i18n.t('discovery:booking.error.chooseDate') }),
    time: z.string().regex(/^\d{2}:\d{2}$/, { message: i18n.t('discovery:booking.error.chooseTime') }),
    message: z.
    string().
    transform(sanitizeText).
    pipe(
      z.
      string().
      min(BOOKING_MESSAGE_MIN, i18n.t('discovery:booking.error.messageMin', { name: vendorName, min: BOOKING_MESSAGE_MIN })).
      max(BOOKING_MESSAGE_MAX, i18n.t('discovery:booking.error.messageMax', { max: BOOKING_MESSAGE_MAX }))
    )
  }).
  superRefine((v, ctx) => {
    const day = parseISO(v.date);
    if (Number.isNaN(day.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: i18n.t('discovery:booking.error.chooseDate') });
      return;
    }
    if (isBefore(day, today)) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: i18n.t('discovery:booking.error.dateFuture') });
      return;
    }
    if (isAfter(day, lastDay)) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: i18n.t('discovery:booking.error.dateWindow', { days: BOOKING_WINDOW_DAYS }) });
      return;
    }
    const weekday = weekdayOfDate(day);
    const hours = workingHours[weekday];
    if (!hours.open) {
      const dayName = weekdayLabel(weekday, weekdays.find((w) => w.id === weekday)?.label);
      ctx.addIssue({ code: 'custom', path: ['date'], message: i18n.t('discovery:booking.error.closedOn', { name: vendorName, day: dayName }) });
      return;
    }
    const minutes = toMinutes(v.time);
    if (minutes < toMinutes(hours.opensAt) || minutes >= toMinutes(hours.closesAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['time'],
        message: i18n.t('discovery:booking.error.timeBetween', { from: formatClock(hours.opensAt), to: formatClock(hours.closesAt) })
      });
      return;
    }
    if (v.date === format(now, 'yyyy-MM-dd') && minutes <= now.getHours() * 60 + now.getMinutes()) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: i18n.t('discovery:booking.error.timePassed') });
    }
  });
}

export type BookingFormValues = z.input<ReturnType<typeof makeBookingSchema>>;
export type BookingFormData = z.output<ReturnType<typeof makeBookingSchema>>;
