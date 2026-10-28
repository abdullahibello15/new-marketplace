import type { ADJUSTMENT_TARGET, CHART_PERIOD, LEDGER_ENTRY_TYPE, PAYOUT_REQUEST_STATUS } from './constants';

type ValueOf<T> = T[keyof T];

export type LedgerEntryType = ValueOf<typeof LEDGER_ENTRY_TYPE>;
export type AdjustmentTarget = ValueOf<typeof ADJUSTMENT_TARGET>;
export type PayoutRequestStatus = ValueOf<typeof PAYOUT_REQUEST_STATUS>;
export type ChartPeriod = ValueOf<typeof CHART_PERIOD>;

/** The signed-in investor (the "Investor" role). */
export interface InvestorProfile {
  id: string;
  name: string;
  role: 'investor';
  /** Where payouts go, masked, e.g. "Access Bank ••7731". */
  payoutAccount: string;
}

/** Something the investor holds a stake in. */
export interface Investment {
  id: string;
  name: string;
  description: string;
  /** All capital raised for this investment (every investor), whole Naira. Share % = your capital ÷ this. */
  totalCapital: number;
}

/**
 * One line in the investor's ledger. Never edited, only appended. `amount` is the signed effect on the
 * balance in whole Naira: contributions and accruals are positive, payouts negative, adjustments either.
 * Every balance is calculated from these (utils/ledger.ts); none is stored.
 */
export interface LedgerEntry {
  id: string;
  investorId: string;
  investmentId: string;
  type: LedgerEntryType;
  /** ISO date-time. */
  date: string;
  description: string;
  amount: number;
  /** Adjustments only: whether it corrects capital or dividends. */
  adjusts?: AdjustmentTarget;
  /** Dividend paid entries: the payout request it settles. */
  payoutRequestId?: string;
}

/** A request to pay out the available dividends. Approval (mocked) appends Dividend paid entries. */
export interface PayoutRequest {
  id: string;
  investorId: string;
  amount: number;
  status: PayoutRequestStatus;
  requestedAt: string;
  decidedAt: string | null;
  payoutAccount: string;
  note: string | null;
}

/** Totals for the overview cards, all derived from the ledger (and pending requests). */
export interface InvestorBalances {
  invested: number;
  /** Dividends accrued, including dividend adjustments. */
  accrued: number;
  paidOut: number;
  /** Accrued but not yet paid out. */
  available: number;
  /** Requested and waiting for approval. */
  pending: number;
  /** What a new payout request can ask for: available − pending. */
  requestable: number;
  /** Dividends accrued ÷ invested, as a percentage (1 decimal). 0 when nothing is invested. */
  returnPercent: number;
}

export interface InvestmentBreakdown {
  investment: Investment;
  invested: number;
  /** Your capital ÷ the investment's total capital, as a percentage (2 decimals). */
  sharePercent: number;
  accrued: number;
  paidOut: number;
  available: number;
}

/** A ledger entry with the balance after it (capital + dividends not yet paid). */
export interface LedgerRow {
  entry: LedgerEntry;
  balance: number;
}

export interface LedgerFilters {
  type: LedgerEntryType | 'all';
  /** "yyyy-MM-dd", inclusive; empty for no limit. */
  from: string;
  to: string;
}

/** One point on the accumulation chart: cumulative totals at the end of a month. */
export interface AccumulationPoint {
  /** "yyyy-MM" */
  month: string;
  label: string;
  accrued: number;
  paid: number;
}

export interface DividendEstimate {
  /** ISO: the next declaration date from the config. */
  nextDeclarationAt: string;
  /** Average of the last few declarations; null when there's no history yet. */
  estimate: number | null;
  /** How many past declarations the estimate is based on. */
  basedOn: number;
}

/** Everything the investor dashboard reads, from the service. */
export interface InvestorDashboard {
  investor: InvestorProfile;
  investments: Investment[];
  /** Oldest first. */
  entries: LedgerEntry[];
  /** Newest first. */
  payoutRequests: PayoutRequest[];
  balances: InvestorBalances;
  breakdown: InvestmentBreakdown[];
  nextDividend: DividendEstimate;
}
