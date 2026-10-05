import type { DisputeReason, JobActor, JobStatus, RescheduleStatus, TimeWindow } from './types';

/**
 * Every job status, in one place. Main path:
 *   Requested → Quoted → Scheduled → In Progress → Awaiting confirmation → Completed → Closed
 * Side branches: Declined, Quote Rejected, Cancelled (end states) and Disputed (held for review).
 * Which moves are allowed, by whom and when, lives in stateMachine.ts.
 */
export const JOB_STATUS = {
  Requested: 'requested',
  Quoted: 'quoted',
  Scheduled: 'scheduled',
  InProgress: 'in_progress',
  AwaitingConfirmation: 'awaiting_confirmation',
  Completed: 'completed',
  Closed: 'closed',
  Declined: 'declined',
  QuoteRejected: 'quote_rejected',
  Cancelled: 'cancelled',
  Disputed: 'disputed'
} as const;

/** The happy path, in order. Used by the timeline. */
export const JOB_MAIN_PATH: readonly JobStatus[] = [
JOB_STATUS.Requested,
JOB_STATUS.Quoted,
JOB_STATUS.Scheduled,
JOB_STATUS.InProgress,
JOB_STATUS.AwaitingConfirmation,
JOB_STATUS.Completed,
JOB_STATUS.Closed];


/** Ways a job can leave the main path. */
export const JOB_SIDE_BRANCHES: readonly JobStatus[] = [JOB_STATUS.Declined, JOB_STATUS.QuoteRejected, JOB_STATUS.Cancelled, JOB_STATUS.Disputed];

/** Jobs that hold a slot in the vendor's calendar. */
export const BOOKED_JOB_STATUSES: readonly JobStatus[] = [
JOB_STATUS.Scheduled,
JOB_STATUS.InProgress,
JOB_STATUS.AwaitingConfirmation,
JOB_STATUS.Completed,
JOB_STATUS.Closed,
JOB_STATUS.Disputed];


/** Every status in display order (main path, then side branches). */
export const JOB_STATUS_ORDER: readonly JobStatus[] = [...JOB_MAIN_PATH, ...JOB_SIDE_BRANCHES];

export const JOB_STATUS_META: Record<JobStatus, {label: string;badgeClass: string;dotClass: string;description: string;}> = {
  requested: {
    label: 'Requested',
    badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]',
    dotClass: 'bg-[#2B4A7A]',
    description: 'Waiting for the vendor to send a quote.'
  },
  quoted: {
    label: 'Quoted',
    badgeClass: 'bg-[#F7EBCB] text-mustard-dark',
    dotClass: 'bg-mustard-dark',
    description: 'The vendor sent a quote. The customer can accept or reject it.'
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-[#E3EEEC] text-pine',
    dotClass: 'bg-pine',
    description: 'Quote accepted. Date and price are locked in.'
  },
  in_progress: {
    label: 'In progress',
    badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]',
    dotClass: 'bg-[#5B3E8A]',
    description: 'The vendor has arrived and started the job.'
  },
  awaiting_confirmation: {
    label: 'Awaiting confirmation',
    badgeClass: 'bg-[#FFE8CC] text-[#8A4B00]',
    dotClass: 'bg-[#8A4B00]',
    description: 'The vendor marked the work as done. Waiting for the customer to confirm.'
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-pine text-white',
    dotClass: 'bg-white',
    description: 'The customer confirmed the work is done.'
  },
  closed: {
    label: 'Closed',
    badgeClass: 'bg-[#DCD6CA] text-ink',
    dotClass: 'bg-ink',
    description: 'Finished. Nothing left to do.'
  },
  declined: {
    label: 'Declined',
    badgeClass: 'bg-clay-soft text-clay-dark',
    dotClass: 'bg-clay-dark',
    description: 'The vendor can’t take this job.'
  },
  quote_rejected: {
    label: 'Quote rejected',
    badgeClass: 'bg-[#F9E3EE] text-[#9D2E63]',
    dotClass: 'bg-[#9D2E63]',
    description: 'The customer turned down the quote.'
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-sand text-muted',
    dotClass: 'bg-muted',
    description: 'The job was called off.'
  },
  disputed: {
    label: 'Disputed',
    badgeClass: 'bg-[#8F3916] text-white',
    dotClass: 'bg-white',
    description: 'The customer reported a problem. Gwani’s team is reviewing it.'
  }
};

/* ---------- Lifecycle timing ---------- */

/** The vendor can start ("I've arrived") from this long before the scheduled time. */
export const START_JOB_EARLY_MINUTES = 60;
/** Without a response from the customer, finished work is confirmed automatically after this long. */
export const AUTO_CONFIRM_HOURS = 48;
/** Completed jobs close automatically after this long if the customer skips the review step. */
export const AUTO_CLOSE_DAYS = 7;

/* ---------- Reschedule ---------- */

export const RESCHEDULE_MAX_REQUESTS = 2;
/** No reschedule requests this close to the start. */
export const RESCHEDULE_CUTOFF_HOURS = 2;
export const RESCHEDULE_REASON_MIN = 5;

export const RESCHEDULE_STATUS = {
  Pending: 'pending',
  Accepted: 'accepted',
  Declined: 'declined'
} as const;

export const RESCHEDULE_STATUS_LABELS: Record<RescheduleStatus, string> = {
  pending: 'Waiting for a reply',
  accepted: 'Accepted',
  declined: 'Declined'
};

/* ---------- Disputes and reviews ---------- */

export const DISPUTE_REASON = {
  NotFinished: 'not_finished',
  PoorQuality: 'poor_quality',
  Damage: 'damage',
  PriceChanged: 'price_changed',
  Other: 'other'
} as const;

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  not_finished: 'The work isn’t finished',
  poor_quality: 'The work is poor quality or doesn’t work',
  damage: 'Something was damaged',
  price_changed: 'They asked for more than the agreed price',
  other: 'Something else'
};

export const DISPUTE_DETAILS_MIN = 10;
export const DISPUTE_DETAILS_MAX = 500;
export const REVIEW_COMMENT_MAX = 500;

export const JOB_ACTOR = {
  Customer: 'customer',
  Vendor: 'vendor',
  System: 'system'
} as const;

export const JOB_ACTOR_LABELS: Record<JobActor, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  system: 'Gwani'
};

export const TIME_WINDOW = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Evening: 'evening',
  Anytime: 'anytime'
} as const;

/** Preferred time windows customers pick from. Times are 24-hour "HH:mm", West Africa Time. */
export const TIME_WINDOWS: {id: TimeWindow;label: string;start: string;end: string;}[] = [
{ id: TIME_WINDOW.Morning, label: 'Morning (8am – 12pm)', start: '08:00', end: '12:00' },
{ id: TIME_WINDOW.Afternoon, label: 'Afternoon (12pm – 4pm)', start: '12:00', end: '16:00' },
{ id: TIME_WINDOW.Evening, label: 'Evening (4pm – 7pm)', start: '16:00', end: '19:00' },
{ id: TIME_WINDOW.Anytime, label: 'Any time they’re open', start: '00:00', end: '23:59' }];


/* ---------- Form limits ---------- */

export const JOB_DESCRIPTION_MIN = 20;
export const JOB_DESCRIPTION_MAX = 1000;
export const JOB_PHOTOS_MIN = 1;
export const JOB_PHOTOS_MAX = 5;
export const JOB_LANDMARK_MIN = 5;
export const JOB_LANDMARK_MAX = 200;
export const JOB_BOOKING_WINDOW_DAYS = 60;
export const REASON_MAX = 300;

export const QUOTE_PRICE_MIN = 500;
export const QUOTE_PRICE_MAX = 10_000_000;
export const QUOTE_INCLUDES_MIN = 5;
export const QUOTE_INCLUDES_MAX = 300;

/** Estimated job length options for a quote, in hours. */
export const QUOTE_DURATIONS: {hours: number;label: string;}[] = [
{ hours: 1, label: 'About 1 hour' },
{ hours: 2, label: 'About 2 hours' },
{ hours: 3, label: 'About 3 hours' },
{ hours: 4, label: 'Half a day' },
{ hours: 8, label: 'A full day' },
{ hours: 16, label: 'Two days' }];


/** How long a quote stays open for the customer to accept. */
export const QUOTE_EXPIRY_OPTIONS: {hours: number;label: string;}[] = [
{ hours: 24, label: '24 hours' },
{ hours: 48, label: '2 days' },
{ hours: 72, label: '3 days' },
{ hours: 168, label: '1 week' }];


/** The signed-in customer in this front-end-only build. A real app gets this from the session. */
export const CURRENT_CUSTOMER_ID = 'cust-aisha';

/* ---------- Routes ---------- */

export const JOB_ROUTES = {
  myJobs: '/jobs',
  job: (id: string) => `/jobs/${encodeURIComponent(id)}`,
  request: (vendorId: string) => `/vendors/${encodeURIComponent(vendorId)}/book`
} as const;
