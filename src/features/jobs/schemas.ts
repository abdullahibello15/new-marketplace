import { addDays, isAfter, isBefore, parseISO, startOfToday } from 'date-fns';
import { z } from 'zod';
import { weekdays } from '../../data/weekdays';
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
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.');

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
    ctx.addIssue({ code: 'custom', path: [path], message: 'Choose today or a later date.' });
    return null;
  }
  if (isAfter(day, addDays(today, JOB_BOOKING_WINDOW_DAYS))) {
    ctx.addIssue({ code: 'custom', path: [path], message: `Choose a date in the next ${JOB_BOOKING_WINDOW_DAYS} days.` });
    return null;
  }
  const weekday = weekdayOfDate(day);
  const hours = workingHours[weekday];
  if (!hours.open) {
    const name = weekdays.find((w) => w.id === weekday)?.label ?? 'that day';
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
      min(JOB_DESCRIPTION_MIN, `Describe the job in at least ${JOB_DESCRIPTION_MIN} characters so ${vendorName} can quote accurately.`).
      max(JOB_DESCRIPTION_MAX, `Keep the description to ${JOB_DESCRIPTION_MAX} characters.`)
    ),
    photos: z.
    array(z.string()).
    min(JOB_PHOTOS_MIN, 'Add at least one photo of the job.').
    max(JOB_PHOTOS_MAX, `Use ${JOB_PHOTOS_MAX} photos or fewer.`),
    preferredDate: dateKey,
    timeWindow: z.enum(TIME_WINDOW, { error: 'Choose a time window.' }),
    landmark: cleanText.pipe(
      z.
      string().
      min(JOB_LANDMARK_MIN, 'Add a street, house number or landmark so the vendor can find you.').
      max(JOB_LANDMARK_MAX, `Keep it to ${JOB_LANDMARK_MAX} characters.`)
    ),
    placeId: z.string().min(1, 'Choose your town or LGA.'),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).nullable()
  }).
  superRefine((v, ctx) => {
    const hours = checkWorkingDay(v.preferredDate, workingHours, (d) => `${vendorName} doesn’t work on ${d}s. Please pick another day.`, ctx, 'preferredDate');
    const window = TIME_WINDOWS.find((w) => w.id === v.timeWindow);
    if (!hours || !window) return;
    // The window must overlap the vendor's opening hours that day.
    if (toMinutes(window.start) >= toMinutes(hours.closesAt) || toMinutes(window.end) <= toMinutes(hours.opensAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeWindow'],
        message: `${vendorName} works ${formatClock(hours.opensAt)} – ${formatClock(hours.closesAt)} that day. Choose a window inside those hours.`
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
        ctx.addIssue({ code: 'custom', message: 'Enter your price in Naira, like 15,000.' });
        return z.NEVER;
      }
      if (value < QUOTE_PRICE_MIN) {
        ctx.addIssue({ code: 'custom', message: `A quote must be at least ₦${QUOTE_PRICE_MIN.toLocaleString('en-NG')}.` });
        return z.NEVER;
      }
      if (value > QUOTE_PRICE_MAX) {
        ctx.addIssue({ code: 'custom', message: 'That price looks too high. Check for extra zeros.' });
        return z.NEVER;
      }
      return value;
    }),
    includes: cleanText.pipe(
      z.
      string().
      min(QUOTE_INCLUDES_MIN, 'Say what the price covers, e.g. parts, labour, clean-up.').
      max(QUOTE_INCLUDES_MAX, `Keep it to ${QUOTE_INCLUDES_MAX} characters.`)
    ),
    durationHours: z.string().transform(Number).refine((h) => QUOTE_DURATIONS.some((d) => d.hours === h), 'Choose an estimated duration.'),
    proposedDate: dateKey,
    proposedTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a start time.'),
    expiresInHours: z.string().transform(Number).refine((h) => QUOTE_EXPIRY_OPTIONS.some((o) => o.hours === h), 'Choose when the quote expires.')
  }).
  superRefine((v, ctx) => {
    const hours = checkWorkingDay(v.proposedDate, workingHours, (d) => `You’re closed on ${d}s. Pick a working day, or update your hours on Edit Profile.`, ctx, 'proposedDate');
    if (!hours) return;
    const minutes = toMinutes(v.proposedTime);
    if (minutes < toMinutes(hours.opensAt) || minutes >= toMinutes(hours.closesAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['proposedTime'],
        message: `Pick a start time within your hours that day (${formatClock(hours.opensAt)} – ${formatClock(hours.closesAt)}).`
      });
      return;
    }
    const start = new Date(`${v.proposedDate}T${v.proposedTime}`);
    if (start <= new Date()) {
      ctx.addIssue({ code: 'custom', path: ['proposedTime'], message: 'That time has already passed.' });
      return;
    }
    // The customer must be able to accept before the job starts.
    if (Date.now() + v.expiresInHours * 3_600_000 > start.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['expiresInHours'], message: 'The quote would still be open after the job starts. Choose a shorter expiry.' });
    }
  });
}

export type QuoteFormValues = z.input<ReturnType<typeof makeQuoteSchema>>;
export type QuoteFormData = z.output<ReturnType<typeof makeQuoteSchema>>;

/** Optional reason when declining a request or rejecting a quote. */
export const reasonSchema = z.object({
  reason: cleanText.pipe(z.string().max(REASON_MAX, `Keep it to ${REASON_MAX} characters.`))
});
export type ReasonFormValues = z.input<typeof reasonSchema>;
export type ReasonFormData = z.output<typeof reasonSchema>;

/* ---------- Task 56: reschedule (either side) ---------- */

export function makeRescheduleSchema({ workingHours, currentStart }: {workingHours: WorkingHours;currentStart: string | null;}) {
  return z.
  object({
    date: dateKey,
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
    reason: cleanText.pipe(
      z.string().min(RESCHEDULE_REASON_MIN, 'Say why you need to move it.').max(REASON_MAX, `Keep it to ${REASON_MAX} characters.`)
    )
  }).
  superRefine((v, ctx) => {
    const hours = checkWorkingDay(v.date, workingHours, (d) => `The vendor doesn’t work on ${d}s. Pick another day.`, ctx, 'date');
    if (!hours) return;
    const minutes = toMinutes(v.time);
    if (minutes < toMinutes(hours.opensAt) || minutes >= toMinutes(hours.closesAt)) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: `Choose a time between ${formatClock(hours.opensAt)} and ${formatClock(hours.closesAt)}.` });
      return;
    }
    const start = new Date(`${v.date}T${v.time}`);
    if (start.getTime() < Date.now() + RESCHEDULE_CUTOFF_HOURS * 3_600_000) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: `The new time must be at least ${RESCHEDULE_CUTOFF_HOURS} hours from now.` });
      return;
    }
    if (currentStart && start.getTime() === new Date(currentStart).getTime()) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: 'That’s the time it’s already booked for.' });
    }
  });
}

export type RescheduleFormValues = z.input<ReturnType<typeof makeRescheduleSchema>>;
export type RescheduleFormData = z.output<ReturnType<typeof makeRescheduleSchema>>;

/* ---------- Task 55: report a problem, review ---------- */

export const reportProblemSchema = z.object({
  reason: z.enum(DISPUTE_REASON, { error: 'Choose what went wrong.' }),
  details: cleanText.pipe(
    z.
    string().
    min(DISPUTE_DETAILS_MIN, `Describe the problem (at least ${DISPUTE_DETAILS_MIN} characters) so our team can help.`).
    max(DISPUTE_DETAILS_MAX, `Keep it to ${DISPUTE_DETAILS_MAX} characters.`)
  )
});
export type ReportProblemFormValues = z.input<typeof reportProblemSchema>;
export type ReportProblemFormData = z.output<typeof reportProblemSchema>;

export const reviewSchema = z.object({
  rating: z.custom<StarLevel>((v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5, 'Choose a star rating.'),
  comment: cleanText.pipe(z.string().max(REVIEW_COMMENT_MAX, `Keep your review to ${REVIEW_COMMENT_MAX} characters.`))
});
export type ReviewFormValues = z.input<typeof reviewSchema>;
export type ReviewFormData = z.output<typeof reviewSchema>;
