import type { NigerLga, TradeCategory, Verification, WorkingHours } from '../../../types/marketplace';
import type { InvoiceKind, PlanId, SubscriptionStatus } from '../../vendor-dashboard/types';
import type { ChurnReasonId } from './config';
import type { SlaType } from './slaConfig';

export type RangePreset = '7d' | '30d' | '90d' | '12m' | 'custom';
export type BusinessKind = 'service' | 'retail';
export type BucketSize = 'day' | 'week' | 'month';
export type AnalyticsTab = 'vendors' | 'gmv' | 'subscriptions' | 'sla' | 'churn' | 'queues';

/** Inclusive on both ends. */
export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

/** The dashboard's shared controls, as kept in the URL. */
export interface AnalyticsQuery {
  preset: RangePreset;
  /** "yyyy-MM-dd", for custom ranges. */
  from: string;
  to: string;
  compare: boolean;
  kind: BusinessKind;
}

/* ---------- Facts: the normalised records every figure is calculated from ---------- */

export interface VendorFact {
  id: string;
  name: string;
  kind: BusinessKind;
  category: TradeCategory;
  /** Where they work (the same areas the customer search filters on). */
  serviceAreas: NigerLga[];
  verification: Verification;
  /** Their first subscription payment. */
  joinedAt: string;
  /** Former vendors only. */
  leftAt: string | null;
  /** Still in the directory. */
  current: boolean;
}

/** One job (services) or order (retail), from request to outcome. */
export interface WorkFact {
  id: string;
  kind: BusinessKind;
  vendorId: string;
  category: TradeCategory;
  /** Where the work happened: the job address or delivery area, else the vendor's own area. */
  lga: NigerLga;
  requestedAt: string;
  /** Jobs only: the vendor sent a quote. */
  quotedAt: string | null;
  /** Job booked (quote accepted) or order confirmed. */
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  disputedAt: string | null;
  /** Whole Naira: the agreed price (jobs) or the order total (retail). */
  value: number;
  paidVia: 'escrow' | 'cash' | null;
}

/** Commission Gwani took when escrow released money to a vendor. */
export interface CommissionFact {
  at: string;
  amount: number;
}

/** A paid stretch of subscription for one vendor (their own plan or a bundle that covers them). */
export interface CoverageFact {
  vendorId: string;
  start: string;
  end: string;
  /** What this vendor's cover is worth per month (plan price, or their share of a bundle). */
  monthlyValue: number;
  planId: PlanId;
  viaBundle: boolean;
}

/** A subscription payment (revenue). Bundle invoices are one payment for several members. */
export interface RevenueFact {
  id: string;
  /** The vendor, or the association for bundles. */
  payerId: string;
  paidAt: string;
  amount: number;
  /** Plan, or 'bundle' for association bundles. */
  line: PlanId | 'bundle';
  kind: InvoiceKind;
}

/** Something a vendor had to respond to, and when they did (for response-time SLAs). */
export interface ResponseFact {
  id: string;
  vendorId: string;
  type: SlaType;
  /** e.g. "Job #2330 · Borehole pump installation" */
  label: string;
  category: TradeCategory;
  lga: NigerLga;
  requestedAt: string;
  /** Null while unanswered. */
  respondedAt: string | null;
}

/** Why a vendor said they were leaving (cancel-subscription dialog or exit survey). */
export interface ChurnReasonFact {
  vendorId: string;
  reason: ChurnReasonId;
  comment: string;
  at: string;
  source: 'cancel_dialog' | 'exit_survey';
}

export interface AnalyticsFacts {
  vendors: VendorFact[];
  work: WorkFact[];
  responses: ResponseFact[];
  /** Each vendor's working hours and the "yyyy-MM-dd" days they took off (the SLA clock runs on these). */
  workingHours: Map<string, WorkingHours>;
  blockedDays: Map<string, Set<string>>;
  churnReasons: ChurnReasonFact[];
  commission: CommissionFact[];
  coverage: CoverageFact[];
  revenue: RevenueFact[];
  /** Vendors suspended right now by Gwani's moderators (on top of lapsed subscriptions). */
  suspendedByAdmin: string[];
  generatedAt: string;
}

/* ---------- Results ---------- */

export interface Comparable {
  value: number;
  previous: number | null;
  /** % change vs the previous period; null when there's nothing to compare. */
  change: number | null;
}

export type SubscriberStatus = SubscriptionStatus | 'none';

/** A vendor's plan line at a moment ('none' when not covered). */
export type PlanLine = PlanId | 'bundle' | 'none';

/** The SLA tab's filters (vendor-name search is applied in the table). */
export interface SlaFilters {
  slaType: SlaType | 'all';
  category: TradeCategory | 'all';
  lga: NigerLga | 'all';
  plan: PlanLine | 'all';
}
