import type { Message } from '../../domain/message';
import type { EscrowLedgerEntry, PaymentMethod } from '../payments/types';
import type {
  CALENDAR_VIEW,
  DAY_AVAILABILITY,
  BILLING_PERIOD,
  EARNING_STAGE,
  INVOICE_KIND,
  ASSOCIATION_MEMBER_STATUS,
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
  /** Translation key under vendor:plan.feature. */
  id: string;
  label: string;
  values: Record<PlanId, boolean | string>;
}

export interface PlanCatalogue {
  plans: SubscriptionPlan[];
  features: PlanFeature[];
}

/** A vendor whose subscription is paid by a trade association's bundle. */
export interface SubscriptionCoverage {
  associationId: string;
  associationName: string;
  /** Covered until the end of this day (the bundle's renewal date, or the paid-up date if removed). */
  until: string;
  /** Taken off the bundle; covered until `until` only. */
  removed: boolean;
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
  /**
   * Set when an association's bundle pays for this vendor. Then planId and renewsOn come from the bundle,
   * and the vendor can't pay separately. Filled in by the service; never stored on the vendor's own record.
   */
  coveredBy: SubscriptionCoverage | null;
}

/** Where a vendor stands right now, from the one status helper. Used by search, booking and the dashboard. */
export interface VendorStanding {
  status: SubscriptionStatus;
  /** The end date the status is worked out from; null for vendors with no subscription record (treated as active). */
  renewsOn: string | null;
  coveredBy: SubscriptionCoverage | null;
  /** Set while Gwani's moderation team has suspended the vendor (same soft suspension as a lapsed plan). */
  adminSuspension: {reason: string;at: string;} | null;
}

export type AssociationMemberStatus = ValueOf<typeof ASSOCIATION_MEMBER_STATUS>;

export interface AssociationMember {
  id: string;
  vendorId: string;
  vendorName: string;
  /** The phone or email the admin added them with. */
  contact: string;
  status: AssociationMemberStatus;
  addedAt: string;
  /** When the bundle started paying for them (null until their first payment). */
  coveredFrom: string | null;
  removedAt: string | null;
  /** Removed members keep access until this date (the end of the period already paid for). */
  accessUntil: string | null;
}

/** A trade association: one organisation account paying one bundled invoice for its member vendors. */
export interface Association {
  id: string;
  name: string;
  adminName: string;
  /** Partner contact details and agreed bundle terms (set for partners created by a bulk import). */
  contactPhone?: string | null;
  contactEmail?: string | null;
  terms?: string | null;
  /** Start and end of the bundle's current paid period. Every covered member renews on renewsOn. */
  periodStart: string;
  renewsOn: string;
  members: AssociationMember[];
}

/** The working behind an invoice amount, shown to the vendor before they pay. */
export interface InvoiceLine {
  /** Stored as { key, params } (plain JSON: the API keeps it as jsonb); shown in the reader's language. */
  label: Message;
  /** Whole Naira; negative for a credit. */
  amount: number;
}

/** A subscription charge. Paid through the shared payment screen (card, transfer or USSD). */
export interface Invoice {
  id: string;
  /** The account billed: the vendor, or the association for bundle invoices. */
  vendorId: string;
  /** Set for association bundle invoices. */
  associationId: string | null;
  /** Bundle invoices: the members this invoice pays for (one line each). Empty for vendor invoices. */
  memberIds: string[];
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
