import { addDays, endOfDay, endOfMonth, format, isAfter, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { fromDateKey } from '../../../lib/dates';
import { BOM, toCsv } from '../../../utils/csv';
import { DIVIDEND_RULES } from '../config';
import { ADJUSTMENT_TARGET, CHART_PERIOD_META, LEDGER_ENTRY_TYPE, LEDGER_ENTRY_TYPE_META, PAYOUT_REQUEST_STATUS } from '../constants';
import type {
  AccumulationPoint,
  ChartPeriod,
  Investment,
  InvestmentBreakdown,
  InvestorBalances,
  LedgerEntry,
  LedgerFilters,
  LedgerRow,
  PayoutRequest } from
'../types';

/*
 * THE investor ledger maths. Every figure on the investor dashboard is calculated here from the ledger
 * entries; no balance is ever stored. Pure (no clock reads, no I/O); tested in ledger.test.ts.
 * Amounts are whole Naira, and an entry's `amount` is its signed effect on the balance.
 */

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Oldest first; entries at the same moment keep their id order, so running balances are stable. */
export const chronological = (entries: readonly LedgerEntry[]) =>
[...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id, undefined, { numeric: true }));

/** Contributions, and adjustments to capital. */
const isCapital = (e: LedgerEntry) => e.type === LEDGER_ENTRY_TYPE.Contribution || e.type === LEDGER_ENTRY_TYPE.Adjustment && e.adjusts === ADJUSTMENT_TARGET.Capital;
/** Accrued dividends, and adjustments to dividends. Adjustments without a target count as dividends. */
const isDividend = (e: LedgerEntry) => e.type === LEDGER_ENTRY_TYPE.DividendAccrued || e.type === LEDGER_ENTRY_TYPE.Adjustment && e.adjusts !== ADJUSTMENT_TARGET.Capital;
const isPayout = (e: LedgerEntry) => e.type === LEDGER_ENTRY_TYPE.DividendPaid;

function totals(entries: readonly LedgerEntry[]) {
  const sum = (keep: (e: LedgerEntry) => boolean) => entries.filter(keep).reduce((s, e) => s + e.amount, 0);
  const invested = sum(isCapital);
  const accrued = sum(isDividend);
  // Payouts are stored as negative amounts.
  const paidOut = 0 - sum(isPayout); // not -sum(…): that gives -0 when nothing was paid
  return { invested, accrued, paidOut, available: accrued - paidOut };
}

/** The overview figures. Pending payout requests reduce what can be requested, not what's available. */
export function computeBalances(entries: readonly LedgerEntry[], requests: readonly PayoutRequest[] = []): InvestorBalances {
  const t = totals(entries);
  const pending = requests.filter((r) => r.status === PAYOUT_REQUEST_STATUS.Pending).reduce((s, r) => s + r.amount, 0);
  return {
    ...t,
    pending,
    requestable: Math.max(0, t.available - pending),
    returnPercent: t.invested > 0 ? round(t.accrued / t.invested * 100, 1) : 0
  };
}

/** Per stake: invested, share of the investment, and its dividends. Investments with no entries are left out. */
export function breakdownByInvestment(entries: readonly LedgerEntry[], investments: readonly Investment[]): InvestmentBreakdown[] {
  return investments.
  map((investment) => ({ investment, mine: entries.filter((e) => e.investmentId === investment.id) })).
  filter(({ mine }) => mine.length > 0).
  map(({ investment, mine }) => {
    const t = totals(mine);
    return {
      investment,
      invested: t.invested,
      sharePercent: investment.totalCapital > 0 ? round(t.invested / investment.totalCapital * 100, 2) : 0,
      accrued: t.accrued,
      paidOut: t.paidOut,
      available: t.available
    };
  });
}

/** Every entry, oldest first, with the balance after it: capital plus dividends not yet paid out. */
export function withRunningBalance(entries: readonly LedgerEntry[]): LedgerRow[] {
  let balance = 0;
  return chronological(entries).map((entry) => {
    balance += entry.amount;
    return { entry, balance };
  });
}

/** Filters rows (balances stay as calculated on the full ledger). Dates are "yyyy-MM-dd", inclusive. */
export function filterLedger(rows: readonly LedgerRow[], { type, from, to }: LedgerFilters): LedgerRow[] {
  const start = from ? startOfDay(fromDateKey(from)) : null;
  const end = to ? endOfDay(fromDateKey(to)) : null;
  return rows.filter(({ entry }) => {
    if (type !== 'all' && entry.type !== type) return false;
    const at = new Date(entry.date);
    return !(start && at < start || end && at > end);
  });
}

/**
 * Cumulative dividends accrued and paid out at the end of each month, for the chart. The totals always
 * count from the very first entry; the period only chooses which months are shown (the current month
 * included). "All time" starts at the month of the first entry.
 */
export function accumulationSeries(entries: readonly LedgerEntry[], period: ChartPeriod, now: Date): AccumulationPoint[] {
  const sorted = chronological(entries);
  if (sorted.length === 0) return [];
  const months = CHART_PERIOD_META[period].months;
  const first = startOfMonth(months === null ? new Date(sorted[0].date) : subMonths(now, months - 1));
  const points: AccumulationPoint[] = [];
  for (let m = first; !isAfter(m, now); m = startOfMonth(addDays(endOfMonth(m), 1))) {
    const upTo = sorted.filter((e) => new Date(e.date) <= endOfMonth(m));
    const t = totals(upTo);
    points.push({ month: format(m, 'yyyy-MM'), label: format(m, 'MMM yy'), accrued: t.accrued, paid: t.paidOut });
  }
  return points;
}

/* ---------- Declarations ---------- */

/** The last moment of the declaration period containing `date` (periods are aligned to the calendar year). */
export function periodEndOn(date: Date, everyMonths: number = DIVIDEND_RULES.declarationEveryMonths): Date {
  const lastMonth = Math.ceil((date.getMonth() + 1) / everyMonths) * everyMonths - 1;
  return endOfMonth(new Date(date.getFullYear(), lastMonth, 1));
}

/** When the next dividend is declared: the end of the current period. */
export function nextDeclarationDate(now: Date, everyMonths: number = DIVIDEND_RULES.declarationEveryMonths): Date {
  const end = periodEndOn(now, everyMonths);
  return end > now ? end : periodEndOn(addDays(end, 1), everyMonths);
}

/**
 * One investor's dividend for one period, by the config rules: the pool is a share of the investment's net
 * revenue, split pro rata to the capital the investor held on the declaration date.
 */
export function dividendForPeriod(
{ netRevenue, capitalHeld, totalCapital }: {netRevenue: number;capitalHeld: number;totalCapital: number;},
rules: Pick<typeof DIVIDEND_RULES, 'poolShareOfNetRevenue'> = DIVIDEND_RULES)
: number {
  if (totalCapital <= 0 || capitalHeld <= 0 || netRevenue <= 0) return 0;
  const pool = netRevenue * rules.poolShareOfNetRevenue;
  return Math.round(pool * Math.min(1, capitalHeld / totalCapital));
}

/**
 * ESTIMATE (not guaranteed) of the next dividend: the average of the investor's last few declarations,
 * each being the total of the accruals declared on one day. Null when nothing has been declared yet.
 */
export function estimateNextDividend(
entries: readonly LedgerEntry[],
basis: number = DIVIDEND_RULES.estimateFromLastDeclarations)
: {estimate: number | null;basedOn: number;} {
  const byDay = new Map<string, number>();
  for (const e of chronological(entries)) {
    if (e.type !== LEDGER_ENTRY_TYPE.DividendAccrued) continue;
    const day = e.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + e.amount);
  }
  const recent = [...byDay.values()].slice(-Math.max(1, basis));
  if (recent.length === 0) return { estimate: null, basedOn: 0 };
  return { estimate: Math.round(recent.reduce((s, n) => s + n, 0) / recent.length), basedOn: recent.length };
}

/* ---------- Payouts ---------- */

/**
 * Splits a payout across stakes in proportion to what's available in each, in whole Naira. Rounding
 * leftovers go to the stake with the most available, so the parts always add up to `amount`.
 */
export function allocatePayout(amount: number, breakdown: readonly Pick<InvestmentBreakdown, 'investment' | 'available'>[]): {investmentId: string;amount: number;}[] {
  const stakes = breakdown.filter((b) => b.available > 0);
  const total = stakes.reduce((s, b) => s + b.available, 0);
  if (amount <= 0 || total <= 0) return [];
  const parts = stakes.map((b) => ({ investmentId: b.investment.id, amount: Math.floor(amount * b.available / total), available: b.available }));
  const leftover = amount - parts.reduce((s, p) => s + p.amount, 0);
  const largest = parts.reduce((a, b) => b.available > a.available ? b : a);
  largest.amount += leftover;
  return parts.filter((p) => p.amount > 0).map(({ investmentId, amount: a }) => ({ investmentId, amount: a }));
}

/* ---------- Export ---------- */

/** The ledger rows as a CSV for Excel: plain numbers in Naira, with a BOM so ₦ in descriptions survives. */
export function ledgerCsv(rows: readonly LedgerRow[], investments: readonly Investment[]): string {
  const nameOf = (id: string) => investments.find((i) => i.id === id)?.name ?? id;
  return BOM + toCsv([
  ['Date', 'Type', 'Investment', 'Description', 'Amount (NGN)', 'Running balance (NGN)'],
  ...rows.map(({ entry, balance }) => [
  format(new Date(entry.date), 'yyyy-MM-dd'),
  LEDGER_ENTRY_TYPE_META[entry.type].label,
  nameOf(entry.investmentId),
  entry.description,
  String(entry.amount),
  String(balance)]
  )]
  ) + '\r\n';
}
