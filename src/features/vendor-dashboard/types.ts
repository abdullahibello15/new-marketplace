import type {
  CALENDAR_VIEW,
  DAY_AVAILABILITY,
  PAYOUT_STATUS,
  PLAN_ID,
  REPORT_REASON,
  SUBSCRIPTION_STATUS } from
'./constants';

import type { Job } from '../jobs/types';

type ValueOf<T> = T[keyof T];

/* ---------- Requests ---------- */

/** A job that has a confirmed slot (Scheduled or later), so it can go on the calendar. */
export type BookedJob = Job & {scheduledAt: string;};

/* ---------- Calendar ---------- */

export type CalendarView = ValueOf<typeof CALENDAR_VIEW>;
export type DayAvailability = ValueOf<typeof DAY_AVAILABILITY>;

/** A date the vendor has taken off. */
export interface BlockedDate {
  /** "yyyy-MM-dd" in the vendor's local calendar. */
  date: string;
  createdAt: string;
}

export interface CalendarDay {
  date: Date;
  key: string;
  inPeriod: boolean;
  isToday: boolean;
  isPast: boolean;
  availability: DayAvailability;
  bookings: BookedJob[];
}

/* ---------- Earnings ---------- */

export type PayoutStatus = ValueOf<typeof PAYOUT_STATUS>;

export interface CompletedTransaction {
  id: string;
  customerName: string;
  item: string;
  /** ISO string. */
  completedAt: string;
  /** What the customer paid, whole Naira. */
  grossAmount: number;
  /** What the vendor receives after the platform fee, whole Naira. */
  netAmount: number;
  payoutStatus: PayoutStatus;
}

/** All amounts are net of the platform fee, whole Naira. */
export interface EarningsSummary {
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  pendingPayouts: number;
}

export interface MonthlyEarning {
  /** "yyyy-MM". */
  month: string;
  /** Net, whole Naira. */
  total: number;
}

export interface EarningsOverview {
  summary: EarningsSummary;
  monthly: MonthlyEarning[];
  transactions: CompletedTransaction[];
}

/* ---------- Reviews ---------- */

export type StarLevel = 1 | 2 | 3 | 4 | 5;
export type RatingFilter = 'all' | StarLevel;
export type ReportReason = ValueOf<typeof REPORT_REASON>;

export interface ReviewReply {
  body: string;
  createdAt: string;
}

export interface ReviewReport {
  reason: ReportReason;
  details: string;
  reportedAt: string;
}

export interface Review {
  id: string;
  customerName: string;
  /** The service or product the review is about. */
  item: string;
  rating: StarLevel;
  comment: string;
  createdAt: string;
  /** One public reply per review. */
  reply: ReviewReply | null;
  report: ReviewReport | null;
}

export interface ReviewStats {
  total: number;
  /** 0 when there are no reviews. */
  average: number;
  counts: Record<StarLevel, number>;
}

export interface ReportReviewInput {
  reason: ReportReason;
  details: string;
}

/* ---------- Subscription ---------- */

export type PlanId = ValueOf<typeof PLAN_ID>;
export type SubscriptionStatus = ValueOf<typeof SUBSCRIPTION_STATUS>;

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  /** Whole Naira per month. 0 for a free plan. */
  monthlyPrice: number;
  tagline: string;
}

/** One row of the plan comparison. `true`/`false` render as a tick or dash; strings show as-is. */
export interface PlanFeature {
  label: string;
  values: Record<PlanId, boolean | string>;
}

export interface PlanCatalogue {
  plans: SubscriptionPlan[];
  features: PlanFeature[];
}

export interface Subscription {
  planId: PlanId;
  /** ISO string. The subscription lapses at the end of this day. */
  renewsOn: string;
  startedAt: string;
}
