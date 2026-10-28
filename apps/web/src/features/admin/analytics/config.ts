import type { RangePreset } from './types';

/*
 * Analytics definitions: the ONE place that says what each figure means. The aggregation helpers read
 * these, and the dashboard shows the same wording in its tooltips, so the numbers and their explanations
 * can't drift apart. ⚠️ PLACEHOLDER thresholds: confirm against the build spec.
 */

/** Who counts as an active vendor in a period. */
export const ACTIVE_VENDOR_RULE = {
  /** At least this many completed jobs or orders in the period. */
  minCompletedInPeriod: 1,
  /** And not suspended at the end of the period (lapsed past the grace period, or suspended by Gwani). */
  excludeSuspended: true,
  description:
  'An active vendor completed at least 1 job or order in the period and wasn’t suspended at the end of it (a lapsed subscription past its grace period, or suspended by Gwani).'
} as const;

export const GMV_DEFINITION =
'GMV-equivalent is the total value of completed work through Gwani: for services, the accepted quote of each completed job; for retail, the order total of each completed order. It’s counted on the day the work was completed. Cancelled, disputed and unfinished work isn’t counted.';

export const RATE_DEFINITIONS = {
  cancellation: 'Cancelled jobs and orders ÷ jobs booked and orders confirmed, in the period.',
  dispute: 'Problems reported ÷ (completed + problems reported), in the period.',
  escrowShare: 'Share of GMV paid online and held in escrow, versus paid in cash on completion.',
  funnel: 'Service requests made in the period, and how many of those were quoted, accepted and completed.',
  mrr: 'Monthly recurring revenue: what every current subscriber (active, expiring soon or in grace) pays per month, at the end of the period. Bundle members count at their share of the bundle.',
  churn: 'Subscribers at the start of the period who were lapsed past the grace period (or gone) by the end of it ÷ subscribers at the start.',
  arpu: 'Subscription revenue in the period ÷ subscribers at the end of the period.',
  renewal: 'Subscription periods that ended in the period and were renewed before their grace period ran out ÷ all such periods whose grace has ended.',
  projection: 'Estimate, not a forecast: current monthly recurring revenue × the renewal rate. Real revenue depends on who renews.',
  commission: 'Platform commission taken when escrow released money to vendors. Not subscription revenue.'
} as const;

/** Time buckets for charts, chosen from the length of the range. */
export const BUCKET_RULES = {
  /** Daily up to this many days. */
  dailyUpToDays: 31,
  /** Weekly up to this many days; monthly beyond. */
  weeklyUpToDays: 120
} as const;

/** "Revenue at risk": subscriptions ending within this many days of the period end. */
export const AT_RISK_DAYS = 30;

export const RANGE_PRESETS: {id: RangePreset;label: string;}[] = [
{ id: '7d', label: '7 days' },
{ id: '30d', label: '30 days' },
{ id: '90d', label: '90 days' },
{ id: '12m', label: '12 months' },
{ id: 'custom', label: 'Custom' }];


/** How many rows "top" lists show. */
export const TOP_VENDORS = 10;

/**
 * Vendor churn: the ONE definition of both kinds (helpers in churn.ts). ⚠️ PLACEHOLDER thresholds.
 */
export const CHURN = {
  /** Activity churn: a vendor with no completed job or order for this many days. PLACEHOLDER */
  inactiveDays: 45,
  definitions: {
    subscription:
    'Subscription churn: a subscribed vendor whose subscription lapsed or wasn’t renewed — the grace period ran out with no new payment. They come back (win-back) when they pay again. Rate = vendors who churned in the period ÷ vendors subscribed at its start.',
    activity:
    'Activity churn: a vendor who went 45 days without completing a job or order. They come back when they complete one again. Rate = vendors who churned in the period ÷ vendors active (a completion in the 45 days before, or joined in that time) at its start.'
  },
  /** At-risk signals. PLACEHOLDER thresholds. */
  risk: {
    /** Falling activity: completions in the last N days at most this share of the N days before… */
    activityWindowDays: 30,
    activityDropShare: 0.5,
    /** …with at least this many before (so one quiet week isn't flagged). */
    activityMinBefore: 2,
    /** Declining rating: the average of the latest N reviews is this far below their earlier average. */
    recentReviews: 5,
    ratingDropBy: 0.5
  },
  /** Cohort table: how many joining months to show. */
  cohortMonths: 12
} as const;

/** Why vendors said they were leaving (cancel dialog and exit survey). */
export const CHURN_REASON_LABELS = {
  too_expensive: 'Subscription too expensive',
  not_enough_jobs: 'Not getting enough jobs or orders',
  moved_away: 'Moved out of the area',
  closed_business: 'Closed or paused the business',
  using_other_platform: 'Using another platform or WhatsApp',
  payment_problems: 'Problems with payments or payouts',
  other: 'Something else'
} as const;

export type ChurnReasonId = keyof typeof CHURN_REASON_LABELS;
