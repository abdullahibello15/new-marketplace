import type { BadgeTone } from '../../components/ui/Badge';
import type { PayoutStatus, ReportReason, SubscriptionStatus } from './types';

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

export const PLATFORM_FEE_RATE = 0.05;
export const EARNINGS_CHART_MONTHS = 6;
export const RECENT_TRANSACTIONS_LIMIT = 8;

export const PAYOUT_STATUS = {
  Paid: 'paid',
  Pending: 'pending'
} as const;

export const PAYOUT_STATUS_META: Record<PayoutStatus, {label: string;tone: BadgeTone;}> = {
  paid: { label: 'Paid out', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' }
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

export const SUBSCRIPTION_STATUS = {
  Active: 'active',
  ExpiringSoon: 'expiring_soon',
  Expired: 'expired'
} as const;

export const SUBSCRIPTION_STATUS_META: Record<SubscriptionStatus, {label: string;tone: BadgeTone;}> = {
  active: { label: 'Active', tone: 'success' },
  expiring_soon: { label: 'Expiring soon', tone: 'warning' },
  expired: { label: 'Expired', tone: 'danger' }
};

/** Show the renewal warning when this many days or fewer remain. */
export const EXPIRY_WARNING_DAYS = 7;

export const PLAN_ID = {
  Starter: 'starter',
  Trade: 'trade',
  Pro: 'pro'
} as const;

/* ---------- Routes ---------- */

export const DASHBOARD_ROUTES = {
  requests: '/pro',
  request: (id: string) => `/pro/requests/${encodeURIComponent(id)}`,
  calendar: '/pro/calendar',
  calendarDay: (dateKey: string) => `/pro/calendar?date=${dateKey}`,
  earnings: '/pro/earnings',
  reviews: '/pro/reviews',
  subscription: '/pro/subscription'
} as const;
