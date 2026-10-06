import type { BadgeTone } from '../../components/ui/Badge';
import type { EarningStage, InvoiceKind, InvoiceStatus, ReportReason, SubscriptionStatus } from './types';

/* ---------- Calendar ---------- */

export const CALENDAR_VIEW = {
  Month: 'month',
  Week: 'week'
} as const;

export const DAY_AVAILABILITY = {
  Open: 'open',
  Closed: 'closed',
  Blocked: 'blocked'
} as const;

/** Calendar weeks start on Monday, matching the working-hours editor. */
export const WEEK_STARTS_ON = 1;

/* ---------- Earnings ---------- */

// The platform commission lives in payments/escrow/escrowConfig.ts (taken when escrow releases).
export const EARNINGS_CHART_MONTHS = 6;
export const RECENT_TRANSACTIONS_LIMIT = 8;

/** Payout state of the older, pre-escrow transactions in the mock history. */
export const PAYOUT_STATUS = {
  Paid: 'paid',
  Pending: 'pending'
} as const;

/** Where the money for one transaction is. Pending = held in escrow; Available = released, not yet paid out. */
export const EARNING_STAGE = {
  Pending: 'pending',
  OnHold: 'on_hold',
  Available: 'available',
  PaidOut: 'paid_out',
  Refunded: 'refunded'
} as const;

export const EARNING_STAGE_META: Record<EarningStage, {label: string;tone: BadgeTone;}> = {
  pending: { label: 'Held in escrow', tone: 'info' },
  on_hold: { label: 'Disputed: on hold', tone: 'danger' },
  available: { label: 'Available', tone: 'warning' },
  paid_out: { label: 'Paid out', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' }
};

/* ---------- Reviews ---------- */

export const REVIEW_REPLY_MAX = 500;
export const REVIEW_REPLY_MIN = 2;
export const REPORT_DETAILS_MAX = 300;
export const REPORT_DETAILS_MIN = 5;

export const REPORT_REASON = {
  Spam: 'spam',
  Offensive: 'offensive',
  NotACustomer: 'not_a_customer',
  Other: 'other'
} as const;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam or advertising',
  offensive: 'Abusive or offensive language',
  not_a_customer: 'Not from a real customer',
  other: 'Something else'
};

export const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

/* ---------- Subscription ---------- */

/** Timings (warning days, grace days) live in plans.ts with the plans. */
export const SUBSCRIPTION_STATUS = {
  Active: 'active',
  ExpiringSoon: 'expiring_soon',
  /** Past the end date but inside the grace period: still visible, renew now. */
  Grace: 'grace',
  /** Grace is over: the profile is limited (hidden from search, no new requests). */
  Expired: 'expired'
} as const;

export const SUBSCRIPTION_STATUS_META: Record<SubscriptionStatus, {label: string;tone: BadgeTone;}> = {
  active: { label: 'Active', tone: 'success' },
  expiring_soon: { label: 'Expiring soon', tone: 'warning' },
  grace: { label: 'Grace period', tone: 'warning' },
  expired: { label: 'Expired: profile limited', tone: 'danger' }
};

export const PLAN_ID = {
  Starter: 'starter',
  Standard: 'standard',
  Premium: 'premium'
} as const;

/** What each plan limits. Values per plan are in plans.ts. */
export const PLAN_LIMIT = {
  PortfolioPhotos: 'portfolioPhotos',
  Products: 'products',
  Services: 'services'
} as const;

export const BILLING_PERIOD = {
  Monthly: 'monthly'
} as const;

/** What an invoice is for. */
export const INVOICE_KIND = {
  Subscribe: 'subscribe',
  Renew: 'renew',
  Upgrade: 'upgrade',
  Downgrade: 'downgrade'
} as const;

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  subscribe: 'New subscription',
  renew: 'Renewal',
  upgrade: 'Upgrade (prorated)',
  downgrade: 'Downgrade (next period)'
};

export const INVOICE_STATUS = {
  /** Waiting for payment. */
  Open: 'open',
  Paid: 'paid',
  /** Replaced by a newer invoice before it was paid. */
  Void: 'void'
} as const;

export const INVOICE_STATUS_META: Record<InvoiceStatus, {label: string;tone: BadgeTone;}> = {
  open: { label: 'Awaiting payment', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  void: { label: 'Replaced', tone: 'neutral' }
};

/* ---------- Routes ---------- */

export const DASHBOARD_ROUTES = {
  requests: '/pro',
  request: (id: string) => `/pro/requests/${encodeURIComponent(id)}`,
  calendar: '/pro/calendar',
  calendarDay: (dateKey: string) => `/pro/calendar?date=${dateKey}`,
  earnings: '/pro/earnings',
  reviews: '/pro/reviews',
  subscription: '/pro/subscription',
  billing: '/pro/subscription/billing',
  invoice: (id: string) => `/pro/subscription/billing/${encodeURIComponent(id)}`,
  /** The shared payment screen, inside the vendor portal. */
  pay: (kind: string, id: string) => `/pro/pay/${kind}/${encodeURIComponent(id)}`
} as const;
