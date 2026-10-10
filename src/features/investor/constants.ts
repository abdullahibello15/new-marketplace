import type { BadgeTone } from '../../components/ui/Badge';
import type { ChartPeriod, LedgerEntryType, PayoutRequestStatus } from './types';

export const LEDGER_ENTRY_TYPE = {
  Contribution: 'contribution',
  DividendAccrued: 'dividend_accrued',
  DividendPaid: 'dividend_paid',
  Adjustment: 'adjustment'
} as const;

export const LEDGER_ENTRY_TYPE_META: Record<LedgerEntryType, {label: string;tone: BadgeTone;}> = {
  contribution: { label: 'Contribution', tone: 'info' },
  dividend_accrued: { label: 'Dividend accrued', tone: 'success' },
  dividend_paid: { label: 'Dividend paid', tone: 'neutral' },
  adjustment: { label: 'Adjustment', tone: 'warning' }
};

/** What an adjustment corrects: the capital invested, or the dividends. */
export const ADJUSTMENT_TARGET = {
  Capital: 'capital',
  Dividends: 'dividends'
} as const;

export const PAYOUT_REQUEST_STATUS = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected'
} as const;

export const PAYOUT_REQUEST_STATUS_META: Record<PayoutRequestStatus, {label: string;tone: BadgeTone;}> = {
  pending: { label: 'Pending approval', tone: 'warning' },
  approved: { label: 'Approved · paid', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' }
};

export const CHART_PERIOD = {
  ThreeMonths: '3m',
  SixMonths: '6m',
  OneYear: '1y',
  All: 'all'
} as const;

export const CHART_PERIOD_META: Record<ChartPeriod, {label: string;months: number | null;}> = {
  '3m': { label: '3 months', months: 3 },
  '6m': { label: '6 months', months: 6 },
  '1y': { label: '1 year', months: 12 },
  all: { label: 'All time', months: null }
};

export const RECENT_ENTRIES_LIMIT = 5;

export const INVESTOR_DISCLAIMER =
'Figures are for information only and aren’t financial advice. Dividends depend on actual results and aren’t guaranteed. This is a demo: no real money moves.';

export const INVESTOR_ROUTES = {
  overview: '/investor',
  ledger: '/investor/ledger',
  payouts: '/investor/payouts'
} as const;
