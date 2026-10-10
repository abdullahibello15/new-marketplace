import { describe, expect, it } from 'vitest';
import { ADJUSTMENT_TARGET, LEDGER_ENTRY_TYPE, PAYOUT_REQUEST_STATUS } from '../constants';
import {
  accumulationSeries,
  allocatePayout,
  breakdownByInvestment,
  computeBalances,
  dividendForPeriod,
  estimateNextDividend,
  filterLedger,
  ledgerCsv,
  nextDeclarationDate,
  periodEndOn,
  withRunningBalance } from
'./ledger';
import type { Investment, LedgerEntry, LedgerEntryType, PayoutRequest } from '../types';

const SEED: Investment = { id: 'seed', name: 'Seed round', description: '', totalCapital: 50_000_000 };
const FLEET: Investment = { id: 'fleet', name: 'Dispatch fleet', description: '', totalCapital: 8_000_000 };

let n = 0;
function entry(type: LedgerEntryType, date: string, amount: number, investmentId = SEED.id, extra: Partial<LedgerEntry> = {}): LedgerEntry {
  n += 1;
  return { id: `e${n}`, investorId: 'inv', investmentId, type, date: `${date}T12:00:00.000Z`, description: `${type} ${n}`, amount, ...extra };
}

const { Contribution, DividendAccrued, DividendPaid, Adjustment } = LEDGER_ENTRY_TYPE;

/** A small history: two stakes, three declarations, one payout, one dividend correction. */
const LEDGER: LedgerEntry[] = [
entry(Contribution, '2026-01-10', 2_000_000),
entry(Contribution, '2026-02-01', 1_000_000, FLEET.id),
entry(DividendAccrued, '2026-03-31', 24_000),
entry(DividendAccrued, '2026-03-31', 30_000, FLEET.id),
entry(DividendAccrued, '2026-06-30', 28_800),
entry(DividendAccrued, '2026-06-30', 35_000, FLEET.id),
entry(DividendPaid, '2026-07-05', -60_000, SEED.id),
entry(Adjustment, '2026-07-10', -800, FLEET.id, { adjusts: ADJUSTMENT_TARGET.Dividends }),
entry(DividendAccrued, '2026-09-30', 30_000)];


const request = (status: PayoutRequest['status'], amount: number): PayoutRequest => ({
  id: `p-${status}`,
  investorId: 'inv',
  amount,
  status,
  requestedAt: '2026-10-01T09:00:00.000Z',
  decidedAt: null,
  payoutAccount: 'Bank ••0000',
  note: null
});

describe('computeBalances', () => {
  it('derives every total from the entries', () => {
    const b = computeBalances(LEDGER);
    expect(b.invested).toBe(3_000_000);
    // 24,000 + 30,000 + 28,800 + 35,000 + 30,000 − 800
    expect(b.accrued).toBe(147_000);
    expect(b.paidOut).toBe(60_000);
    expect(b.available).toBe(87_000);
    expect(b.pending).toBe(0);
    expect(b.requestable).toBe(87_000);
    expect(b.returnPercent).toBe(4.9);
  });

  it('holds back pending requests from what can be requested, not from what is available', () => {
    const b = computeBalances(LEDGER, [request(PAYOUT_REQUEST_STATUS.Pending, 50_000), request(PAYOUT_REQUEST_STATUS.Approved, 10_000)]);
    expect(b.available).toBe(87_000);
    expect(b.pending).toBe(50_000);
    expect(b.requestable).toBe(37_000);
  });

  it('never lets requestable go negative', () => {
    expect(computeBalances(LEDGER, [request(PAYOUT_REQUEST_STATUS.Pending, 100_000)]).requestable).toBe(0);
  });

  it('counts capital adjustments as invested, not as dividends', () => {
    const b = computeBalances([...LEDGER, entry(Adjustment, '2026-08-01', -100_000, SEED.id, { adjusts: ADJUSTMENT_TARGET.Capital })]);
    expect(b.invested).toBe(2_900_000);
    expect(b.accrued).toBe(147_000);
  });

  it('is all zeros for an empty ledger', () => {
    expect(computeBalances([])).toEqual({ invested: 0, accrued: 0, paidOut: 0, available: 0, pending: 0, requestable: 0, returnPercent: 0 });
  });
});

describe('breakdownByInvestment', () => {
  it('splits the totals per stake, with the share of each investment', () => {
    const [seed, fleet] = breakdownByInvestment(LEDGER, [SEED, FLEET]);
    expect(seed).toMatchObject({ invested: 2_000_000, sharePercent: 4, accrued: 82_800, paidOut: 60_000, available: 22_800 });
    expect(fleet).toMatchObject({ invested: 1_000_000, sharePercent: 12.5, accrued: 64_200, paidOut: 0, available: 64_200 });
  });

  it('leaves out investments the investor has no entries for', () => {
    expect(breakdownByInvestment(LEDGER, [SEED, FLEET, { id: 'x', name: 'X', description: '', totalCapital: 1 }])).toHaveLength(2);
  });

  it('adds up to the overall balances', () => {
    const rows = breakdownByInvestment(LEDGER, [SEED, FLEET]);
    const b = computeBalances(LEDGER);
    expect(rows.reduce((s, r) => s + r.available, 0)).toBe(b.available);
    expect(rows.reduce((s, r) => s + r.accrued, 0)).toBe(b.accrued);
  });
});

describe('withRunningBalance and filterLedger', () => {
  it('runs the balance oldest first, whatever order the entries come in', () => {
    const rows = withRunningBalance([...LEDGER].reverse());
    expect(rows.map((r) => r.balance)).toEqual([2_000_000, 3_000_000, 3_024_000, 3_054_000, 3_082_800, 3_117_800, 3_057_800, 3_057_000, 3_087_000]);
    // The last balance is capital plus dividends not yet paid out.
    const b = computeBalances(LEDGER);
    expect(rows[rows.length - 1].balance).toBe(b.invested + b.available);
  });

  it('filters by type and inclusive dates, keeping the full-ledger balances', () => {
    const rows = withRunningBalance(LEDGER);
    const accrued = filterLedger(rows, { type: DividendAccrued, from: '2026-06-30', to: '2026-09-30' });
    expect(accrued.map((r) => r.entry.amount)).toEqual([28_800, 35_000, 30_000]);
    expect(accrued[0].balance).toBe(3_082_800);
    expect(filterLedger(rows, { type: 'all', from: '', to: '' })).toHaveLength(LEDGER.length);
  });
});

describe('accumulationSeries', () => {
  const now = new Date('2026-10-08T10:00:00');

  it('gives cumulative accrued and paid at each month end, counted from the first entry', () => {
    const points = accumulationSeries(LEDGER, '3m', now);
    expect(points.map((p) => p.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(points[0]).toMatchObject({ accrued: 117_000, paid: 60_000 });
    expect(points[1]).toMatchObject({ accrued: 147_000, paid: 60_000 });
    expect(points[2]).toMatchObject({ accrued: 147_000, paid: 60_000 });
  });

  it('starts "all time" at the month of the first entry', () => {
    const points = accumulationSeries(LEDGER, 'all', now);
    expect(points[0]).toMatchObject({ month: '2026-01', accrued: 0, paid: 0 });
    expect(points).toHaveLength(10);
  });

  it('never decreases, except for a negative adjustment', () => {
    const points = accumulationSeries(LEDGER, '1y', now);
    expect(points).toHaveLength(12);
    for (let i = 1; i < points.length; i++) expect(points[i].paid).toBeGreaterThanOrEqual(points[i - 1].paid);
  });

  it('is empty with no entries', () => {
    expect(accumulationSeries([], 'all', now)).toEqual([]);
  });
});

describe('declarations', () => {
  it('finds the end of the declaration period, aligned to the calendar year', () => {
    expect(periodEndOn(new Date(2026, 9, 8), 3)).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    expect(periodEndOn(new Date(2026, 0, 1), 3)).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
    expect(periodEndOn(new Date(2026, 6, 15), 6)).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    expect(periodEndOn(new Date(2026, 1, 3), 1)).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it('gives the next declaration date', () => {
    expect(nextDeclarationDate(new Date(2026, 9, 8), 3)).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    // Exactly at a period end: the next one.
    expect(nextDeclarationDate(new Date(2026, 8, 30, 23, 59, 59, 999), 3)).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  it('calculates one investor’s dividend by the pool rules', () => {
    // 30% of ₦2,000,000 = ₦600,000 pool; 4% of it.
    expect(dividendForPeriod({ netRevenue: 2_000_000, capitalHeld: 2_000_000, totalCapital: 50_000_000 }, { poolShareOfNetRevenue: 0.3 })).toBe(24_000);
    expect(dividendForPeriod({ netRevenue: 2_000_000, capitalHeld: 0, totalCapital: 50_000_000 }, { poolShareOfNetRevenue: 0.3 })).toBe(0);
    expect(dividendForPeriod({ netRevenue: -5_000, capitalHeld: 1, totalCapital: 2 }, { poolShareOfNetRevenue: 0.3 })).toBe(0);
  });

  it('estimates from the last declarations, totalling each declaration day across stakes', () => {
    // Declarations: 54,000 (Mar), 63,800 (Jun), 30,000 (Sep).
    expect(estimateNextDividend(LEDGER, 2)).toEqual({ estimate: 46_900, basedOn: 2 });
    expect(estimateNextDividend(LEDGER, 5)).toEqual({ estimate: 49_267, basedOn: 3 });
    expect(estimateNextDividend([], 2)).toEqual({ estimate: null, basedOn: 0 });
  });
});

describe('allocatePayout', () => {
  it('splits in proportion to what is available, adding up exactly', () => {
    const parts = allocatePayout(87_000, breakdownByInvestment(LEDGER, [SEED, FLEET]));
    expect(parts).toEqual([
    { investmentId: 'seed', amount: 22_800 },
    { investmentId: 'fleet', amount: 64_200 }]
    );
  });

  it('gives the rounding leftover to the largest stake', () => {
    const parts = allocatePayout(100, [
    { investment: SEED, available: 1 },
    { investment: FLEET, available: 2 }]
    );
    expect(parts).toEqual([
    { investmentId: 'seed', amount: 33 },
    { investmentId: 'fleet', amount: 67 }]
    );
  });

  it('skips stakes with nothing available', () => {
    expect(allocatePayout(500, [{ investment: SEED, available: 0 }, { investment: FLEET, available: 900 }])).toEqual([{ investmentId: 'fleet', amount: 500 }]);
    expect(allocatePayout(0, [{ investment: FLEET, available: 900 }])).toEqual([]);
  });
});

describe('ledgerCsv', () => {
  it('exports rows with plain Naira numbers, investment names and running balances', () => {
    const csv = ledgerCsv(withRunningBalance(LEDGER).slice(0, 2), [SEED, FLEET]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Investment,Description,Amount (NGN),Running balance (NGN)');
    expect(lines[1]).toBe('2026-01-10,Contribution,Seed round,contribution 1,2000000,2000000');
    expect(lines[2]).toBe('2026-02-01,Contribution,Dispatch fleet,contribution 2,1000000,3000000');
  });
});
