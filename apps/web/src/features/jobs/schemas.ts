import { addDays, isAfter, isBefore, parseISO, startOfToday } from 'date-fns';
import { z } from 'zod';
import { weekdays } from '../../data/weekdays';
import i18n from '../../i18n';
import { weekdayLabel } from '../../i18n/labels';
import { formatNaira } from '../../utils/format';
import { parseNumberInput } from '../../lib/numberInput';
import { sanitizeText } from '../../lib/sanitize';
import { formatClock, toMinutes, weekdayOfDate } from '../../utils/workingHours';
import {
  JOB_BOOKING_WINDOW_DAYS,
  JOB_DESCRIPTION_MAX,
  JOB_DESCRIPTION_MIN,
  JOB_LANDMARK_MAX,
  JOB_LANDMARK_MIN,
  JOB_PHOTOS_MAX,
  JOB_PHOTOS_MIN,
  QUOTE_DURATIONS,
  QUOTE_EXPIRY_OPTIONS,
  QUOTE_INCLUDES_MAX,
  QUOTE_INCLUDES_MIN,
  QUOTE_PRICE_MAX,
  QUOTE_PRICE_MIN,
  REASON_MAX,
  RESCHEDULE_CUTOFF_HOURS,
  RESCHEDULE_REASON_MIN,
  REVIEW_COMMENT_MAX,
  DISPUTE_DETAILS_MAX,
  DISPUTE_DETAILS_MIN,
  DISPUTE_REASON,
  TIME_WINDOW,
  TIME_WINDOWS } from
'./constants';
import type { WorkingHours } from '../../types/marketplace';
import type { StarLevel } from '../vendor-dashboard/types';

const cleanText = z.string().transform(sanitizeText);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => i18n.t('jobs:form.chooseDate') });

/** Checks a date is today or later, within the booking window, and a day the vendor works. `closedMessage` explains a day off. */
function checkWorkingDay(
dateValue: string,
workingHours: WorkingHours,
closedMessage: (dayName: string) => string,
ctx: z.RefinementCtx,
path: string)
: WorkingHours[keyof WorkingHours] | null {
  const day = parseISO(dateValue);
  const today = startOfToday();
  if (Number.isNaN(day.getTime())) return null;
  if (isBefore(day, today)) {
    ctx.addIssue({ code: 'custom', path: [path], message: i18n.t('jobs:form.dateFuture') });
    return null;
  }
  if (isAfter(day, addDays(today, JOB_BOOKING_WINDOW_DAYS))) {
    ctx.addIssue({ code: 'custom', path: [path], message: i18n.t('jobs:form.dateWindow', { days: JOB_BOOKING_WINDOW_DAYS }) });
    return null;
  }
  const weekday = weekdayOfDate(day);
  const hours = workingHours[weekday];
  if (!hours.open) {
    const name = weekdayLabel(weekday, weekdays.find((w) => w.id === weekday)?.label ?? weekday);
    ctx.addIssue({ code: 'custom', path: [path], message: closedMessage(name) });
    return null;
  }
  return hours;
}

/* ---------- Task 50: job request (customer) ---------- */

export function makeJobRequestSchema({ workingHours, vendorName }: {workingHours: WorkingHours;vendorName: string;}) {
  return z.
  object({
    serviceName: z.string(),
    description: cleanText.pipe(
      z.
      string().
      min(JOB_DESCRIPTION_MIN, i18n.t('jobs:form.descriptionMin', { min: JOB_DESCRIPTION_MIN, name: vendorName })).
      max(JOB_DESCRIPTION_MAX, i18n.t('jobs:form.descriptionMax', { max: JOB_DESCRIPTION_MAX }))
    ),
    photos: z.
    array(z.string()).
    min(JOB_PHOTOS_MIN, i18n.t('jobs:form.photoMin')).
    max(JOB_PHOTOS_MAX, i18n.t('jobs:form.photoMax', { max: JOB_PHOTOS_MAX })),
    preferredDate: dateKey,
    timeWindow: z.enum(TIME_WINDOW, { error: () => i18n.t('jobs:form.chooseWindow') }),
    landmark: cleanText.pipe(
      z.
      string().
      min(JOB_LANDMARK_MIN, i18n.t('jobs:form.landmarkMin')).
      max(JOB_LANDMARK_MAX, i18n.t('jobs:form.keepTo', { max: JOB_LANDMARK_MAX }))
    ),
    placeId: z.string().min(1, i18n.t('jobs:form.choosePlace')),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).nullable()
  }).
  superRefine((v, ctx) => {
    const hours = checkWorkingDay(v.preferredDate, workingHours, (d) => i18n.t('jobs:form.requestClosedOn', { name: vendorName, day: d }), ctx, 'preferredDate');
    const window = TIME_WINDOWS.find((w) => w.id === v.timeWindow);
    if (!hours || !window) return;
    // The window must overlap the vendor's opening hours that day.
    if (toMinutes(window.start) >= toMinutes(hours.closesAt) || toMinutes(window.end) <= toMinutes(hours.opensAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeWindow'],
        message: i18n.t('jobs:form.windowOutside', { name: vendorName, from: formatClock(hours.opensAt), to: formatClock(hours.closesAt) })
      });
    }
  });
}

export type JobRequestFormValues = z.input<ReturnType<typeof makeJobRequestSchema>>;
export type JobRequestFormData = z.output<ReturnType<typeof makeJobRequestSchema>>;

/* ---------- Task 51: quote (vendor) ---------- */

export function makeQuoteSchema({ workingHours }: {workingHours: WorkingHours;}) {
  return z.
  object({
    amount: z.string().transform((raw, ctx) => {
      const value = parseNumberInput(raw);
      if (value === null || Number.isNaN(value)) {
        ctx.addIssue({ code: 'custom', message: i18n.t('jobs:form.priceNaira') });
        return z.NEVER;
      }
      if (value < QUOTE_PRICE_MIN) {
        ctx.addIssue({ code: 'custom', message: i18n.t('jobs:form.quoteMin', { amount: formatNaira(QUOTE_PRICE_MIN) }) });
        return z.NEVER;
      }
      if (value > QUOTE_PRICE_MAX) {
        ctx.addIssue({ code: 'custom', message: i18n.t('jobs:form.priceHigh') });
        return z.NEVER;
      }
      return value;
    }),
    includes: cleanText.pipe(
      z.
      string().
      min(QUOTE_INCLUDES_MIN, i18n.t('jobs:form.includesMin')).
      max(QUOTE_INCLUDES_MAX, i18n.t('jobs:form.keepTo', { max: QUOTE_INCLUDES_MAX }))
    ),
    durationHours: z.string().transform(Number).refine((h) => QUOTE_DURATIONS.some((d) => d.hours === h), i18n.t('jobs:form.chooseDuration')),
    proposedDate: dateKey,
    proposedTime: z.string().regex(/^\d{2}:\d{2}$/, i18n.t('jobs:form.chooseStart')),
    expiresInHours: z.string().transform(Number).refine((h) => QUOTE_EXPIRY_OPTIONS.some((o) => o.hours === h), i18n.t('jobs:form.chooseExpiry'))
  }).
  superRefine((v, ctx) => {
    const hours = checkWorkingDay(v.proposedDate, workingHours, (d) => i18n.t('jobs:form.vendorClosedOn', { day: d }), ctx, 'proposedDate');
    if (!hours) return;
    const minutes = toMinutes(v.proposedTime);
    if (minutes < toMinutes(hours.opensAt) || minutes >= toMinutes(hours.closesAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['proposedTime'],
        message: i18n.t('jobs:form.startWithin', { from: formatClock(hours.opensAt), to: formatClock(hours.closesAt) })
      });
      return;
    }
    const start = new Date(`${v.proposedDate}T${v.proposedTime}`);
    if (start <= new Date()) {
      ctx.addIssue({ code: 'custom', path: ['proposedTime'], message: i18n.t('jobs:form.timePassed') });
      return;
    }
    // The customer must be able to accept before the job starts.
    if (Date.now() + v.expiresInHours * 3_600_000 > start.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['expiresInHours'], message: i18n.t('jobs:form.expiryAfterStart') });
    }
  });
}

export type QuoteFormValues = z.input<ReturnType<typeof makeQuoteSchema>>;
export type QuoteFormData = z.output<ReturnType<typeof makeQuoteSchema>>;

/** Picking "Other" from a preset reason list means the text box is required. */
export const OTHER_REASON = 'other';

/**
 * A reason for declining, rejecting or cancelling. Free text by default; with `presetIds` it's a
 * choice from a list plus "Other". `required` makes a reason mandatory (e.g. cancellation policy).
 */
export function makeReasonSchema({ required = false, presetIds = [] }: {required?: boolean;presetIds?: string[];} = {}) {
  return z.
  object({
    preset: z.string(),
    reason: cleanText.pipe(z.string().max(REASON_MAX, i18n.t('jobs:form.keepTo', { max: REASON_MAX })))
  }).
  superRefine((v, ctx) => {
    if (presetIds.length > 0) {
      if (!v.preset) {
        if (required) ctx.addIssue({ code: 'custom', path: ['preset'], message: i18n.t('jobs:form.chooseReason') });
        return;
      }
      if (v.preset !== OTHER_REASON && !presetIds.includes(v.preset)) {
        ctx.addIssue({ code: 'custom', path: ['preset'], message: i18n.t('jobs:form.chooseReasonList') });
      } else if (v.preset === OTHER_REASON && !v.reason) {
        ctx.addIssue({ code: 'custom', path: ['reason'], message: i18n.t('jobs:form.tellReason') });
      }
    } else if (required && !v.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: i18n.t('jobs:form.giveReason') });
    }
  });
}
export type ReasonFormValues = z.input<ReturnType<typeof makeReasonSchema>>;
export type ReasonFormData = z.output<ReturnType<typeof makeReasonSchema>>;

/* ---------- Task 56: reschedule (either side) ---------- */

export function makeRescheduleSchema({ workingHours, currentStart }: {workingHours: WorkingHours;currentStart: string | null;}) {
  return z.
  object({
    date: dateKey,
    time: z.string().regex(/^\d{2}:\d{2}$/, i18n.t('jobs:form.chooseTime')),
    reason: cleanText.pipe(
      z.string().min(RESCHEDULE_REASON_MIN, i18n.t('jobs:form.moveWhy')).max(REASON_MAX, i18n.t('jobs:form.keepTo', { max: REASON_MAX }))
    )
  }).
  superRefine((v, ctx) => {
    const hours = checkWorkingDay(v.date, workingHours, (d) => i18n.t('jobs:form.vendorNotWorking', { day: d }), ctx, 'date');
    if (!hours) return;
    const minutes = toMinutes(v.time);
    if (minutes < toMinutes(hours.opensAt) || minutes >= toMinutes(hours.closesAt)) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: i18n.t('jobs:form.timeBetween', { from: formatClock(hours.opensAt), to: formatClock(hours.closesAt) }) });
      return;
    }
    const start = new Date(`${v.date}T${v.time}`);
    if (start.getTime() < Date.now() + RESCHEDULE_CUTOFF_HOURS * 3_600_000) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: i18n.t('jobs:form.newTimeCutoff', { hours: RESCHEDULE_CUTOFF_HOURS }) });
      return;
    }
    if (currentStart && start.getTime() === new Date(currentStart).getTime()) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: i18n.t('jobs:form.sameTime') });
    }
  });
}

export type RescheduleFormValues = z.input<ReturnType<typeof makeRescheduleSchema>>;
export type RescheduleFormData = z.output<ReturnType<typeof makeRescheduleSchema>>;

/* ---------- Task 55: report a problem, review ---------- */

export const reportProblemSchema = z.object({
  reason: z.enum(DISPUTE_REASON, { error: () => i18n.t('jobs:form.chooseWhatWrong') }),
  details: cleanText.pipe(
    z.
    string().
    min(DISPUTE_DETAILS_MIN, { error: () => i18n.t('jobs:form.problemMin', { min: DISPUTE_DETAILS_MIN }) }).
    max(DISPUTE_DETAILS_MAX, { error: () => i18n.t('jobs:form.keepTo', { max: DISPUTE_DETAILS_MAX }) })
  )
});
export type ReportProblemFormValues = z.input<typeof reportProblemSchema>;
export type ReportProblemFormData = z.output<typeof reportProblemSchema>;

export const reviewSchema = z.object({
  rating: z.custom<StarLevel>((v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5, { error: () => i18n.t('jobs:form.chooseStars') }),
  comment: cleanText.pipe(z.string().max(REVIEW_COMMENT_MAX, { error: () => i18n.t('jobs:form.reviewMax', { max: REVIEW_COMMENT_MAX }) }))
});
export type ReviewFormValues = z.input<typeof reviewSchema>;
export type ReviewFormData = z.output<typeof reviewSchema>;
