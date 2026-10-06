import type { EscrowLedgerEntry, PaymentMethod } from '../payments/types';
import type {
  CALENDAR_VIEW,
  DAY_AVAILABILITY,
  BILLING_PERIOD,
  EARNING_STAGE,
  INVOICE_KIND,
  INVOICE_STATUS,
  PAYOUT_STATUS,
  PLAN_ID,
  PLAN_LIMIT,
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

/** Payout state of the older, pre-escrow transactions in the mock history. */
export type PayoutStatus = ValueOf<typeof PAYOUT_STATUS>;
/** Where a transaction's money is: held in escrow, on hold for a dispute, available, paid out, or refunded. */
export type EarningStage = ValueOf<typeof EARNING_STAGE>;

export interface CompletedTransaction {
  id: string;
  customerName: string;
  item: string;
  /** ISO string: the latest money event (held, released, paid out…). */
  completedAt: string;
  /** What the customer paid, whole Naira. */
  grossAmount: number;
  /** Platform commission: taken at release, or what it will be while the money is still held. */
  commission: number;
  /** What the vendor receives (or will, once released), whole Naira. */
  netAmount: number;
  stage: EarningStage;
  /** Escrow events with timestamps. Empty for history from before escrow. */
  ledger: EscrowLedgerEntry[];
}

/** All amounts are net of the platform commission, whole Naira. */
export interface EarningsSummary {
  /** Released to you in each period. */
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  /** Held in escrow until customers confirm. */
  pending: number;
  /** Released and waiting for payout. */
  available: number;
  /** Already sent to your bank. */
  paidOut: number;
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

export type PlanLimitKey = ValueOf<typeof PLAN_LIMIT>;
export type BillingPeriod = ValueOf<typeof BILLING_PERIOD>;
export type InvoiceKind = ValueOf<typeof INVOICE_KIND>;
export type InvoiceStatus = ValueOf<typeof INVOICE_STATUS>;

/** How many of each thing a plan allows. null = no plan limit (the app's own maximum still applies). */
export type PlanLimits = Record<PlanLimitKey, number | null>;

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  /** Whole Naira per billing period. */
  price: number;
  billingPeriod: BillingPeriod;
  tagline: string;
  limits: PlanLimits;
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
  vendorId: string;
  planId: PlanId;
  /** ISO string: the start of the current paid period (used for upgrade proration). */
  periodStart: string;
  /** ISO string. The subscription lapses at the end of this day (then the grace period starts). */
  renewsOn: string;
  startedAt: string;
  /** A paid downgrade (or plan change at renewal) waiting for the current period to end. */
  scheduledChange: {planId: PlanId;effectiveAt: string;invoiceId: string;} | null;
}

/** The working behind an invoice amount, shown to the vendor before they pay. */
export interface InvoiceLine {
  label: string;
  /** Whole Naira; negative for a credit. */
  amount: number;
}

/** A subscription charge. Paid through the shared payment screen (card, transfer or USSD). */
export interface Invoice {
  id: string;
  vendorId: string;
  kind: InvoiceKind;
  planId: PlanId;
  /** The plan before this change (same as planId for a renewal). */
  fromPlanId: PlanId;
  /** Whole Naira due. */
  amount: number;
  lines: InvoiceLine[];
  /** The period this pays for. For an upgrade: today until the current end date. */
  periodStart: string;
  periodEnd: string;
  /** When the new plan takes over: now (upgrade, subscribe) or the end of the current period (downgrade). */
  effectiveAt: string;
  status: InvoiceStatus;
  createdAt: string;
  paidAt: string | null;
  /** The payment that paid it. */
  paymentReference: string | null;
  method: PaymentMethod | null;
}

/** What a plan change or renewal would cost, before an invoice is created. */
export type InvoiceQuote = Pick<Invoice, 'kind' | 'planId' | 'fromPlanId' | 'amount' | 'lines' | 'periodStart' | 'periodEnd' | 'effectiveAt'>;
