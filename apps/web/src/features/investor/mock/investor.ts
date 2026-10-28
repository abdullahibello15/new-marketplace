import { addDays, format, subMonths } from 'date-fns';
import { formatNaira } from '../../../utils/format';
import { DIVIDEND_RULES } from '../config';
import { ADJUSTMENT_TARGET, LEDGER_ENTRY_TYPE, PAYOUT_REQUEST_STATUS } from '../constants';
import { allocatePayout, breakdownByInvestment, dividendForPeriod, periodEndOn } from '../utils/ledger';
import type { Investment, InvestorProfile, LedgerEntry, PayoutRequest } from '../types';

/*
 * MOCK investor ledger, relative to today so the chart always has recent data. Dividends are generated
 * with the real rules (config.ts → dividendForPeriod) from mock net revenue, and past payouts are split
 * across stakes with the same helper the service uses, so the history is consistent with the maths.
 */

export const mockInvestor: InvestorProfile = {
  id: 'inv-hadiza-usman',
  name: 'Hadiza Usman',
  role: 'investor',
  payoutAccount: 'Access Bank ••7731'
};

const SEED: Investment = {
  id: 'gwani-seed',
  name: 'Gwani Marketplace · Seed round',
  description: 'Equity stake in the Gwani marketplace platform.',
  totalCapital: 50_000_000
};
const FLEET: Investment = {
  id: 'minna-dispatch-fleet',
  name: 'Minna Dispatch Fleet',
  description: 'Motorbike delivery fleet carrying Gwani orders around Minna.',
  totalCapital: 8_000_000
};

export const mockInvestments: Investment[] = [SEED, FLEET];

/** Mock net revenue per declaration period, oldest first; the last item is the most recent period. */
const NET_REVENUE: Record<string, number[]> = {
  [SEED.id]: [2_000_000, 2_400_000, 2_900_000, 3_100_000, 3_600_000, 3_900_000, 4_400_000],
  [FLEET.id]: [800_000, 950_000, 1_100_000, 1_000_000, 1_250_000, 1_400_000]
};

const EVERY = DIVIDEND_RULES.declarationEveryMonths;
const now = new Date();
/** The declaration date `periodsAgo` periods back (1 = the most recent one). */
const declaredAt = (periodsAgo: number) => periodEndOn(subMonths(now, periodsAgo * EVERY), EVERY);
const periodLabel = (d: Date) => EVERY === 3 ? `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}` : format(d, 'MMM yyyy');

function buildMock(): {entries: LedgerEntry[];requests: PayoutRequest[];} {
  const entries: LedgerEntry[] = [];
  const requests: PayoutRequest[] = [];
  const add = (e: Omit<LedgerEntry, 'id' | 'investorId'>) => entries.push({ ...e, id: `led-${entries.length + 1}`, investorId: mockInvestor.id });
  const capitalIn = (investmentId: string, at: Date) =>
  entries.filter((e) => e.investmentId === investmentId && e.type === LEDGER_ENTRY_TYPE.Contribution && new Date(e.date) <= at).reduce((s, e) => s + e.amount, 0);

  function declare(periodsAgo: number) {
    const at = declaredAt(periodsAgo);
    for (const inv of mockInvestments) {
      const revenues = NET_REVENUE[inv.id];
      const netRevenue = revenues[revenues.length - periodsAgo];
      const capitalHeld = capitalIn(inv.id, at);
      if (netRevenue === undefined || capitalHeld === 0) continue;
      const amount = dividendForPeriod({ netRevenue, capitalHeld, totalCapital: inv.totalCapital });
      const share = (capitalHeld / inv.totalCapital * 100).toFixed(2);
      add({
        investmentId: inv.id,
        type: LEDGER_ENTRY_TYPE.DividendAccrued,
        date: at.toISOString(),
        description: `${periodLabel(at)} dividend: ${Math.round(DIVIDEND_RULES.poolShareOfNetRevenue * 100)}% of ${formatNaira(netRevenue)} net revenue, your ${share}% share`,
        amount
      });
    }
  }

  function payout(id: string, amount: number, at: Date) {
    const parts = allocatePayout(amount, breakdownByInvestment(entries, mockInvestments));
    for (const p of parts) {
      add({ investmentId: p.investmentId, type: LEDGER_ENTRY_TYPE.DividendPaid, date: at.toISOString(), description: `Payout to ${mockInvestor.payoutAccount} (request ${id})`, amount: -p.amount, payoutRequestId: id });
    }
    requests.push({ id, investorId: mockInvestor.id, amount, status: PAYOUT_REQUEST_STATUS.Approved, requestedAt: addDays(at, -2).toISOString(), decidedAt: at.toISOString(), payoutAccount: mockInvestor.payoutAccount, note: null });
  }

  add({ investmentId: SEED.id, type: LEDGER_ENTRY_TYPE.Contribution, date: addDays(declaredAt(8), 20).toISOString(), description: 'Initial investment (bank transfer)', amount: 2_000_000 });
  declare(7);
  add({ investmentId: FLEET.id, type: LEDGER_ENTRY_TYPE.Contribution, date: addDays(declaredAt(7), 15).toISOString(), description: 'Investment in the dispatch fleet (bank transfer)', amount: 1_000_000 });
  declare(6);
  add({ investmentId: SEED.id, type: LEDGER_ENTRY_TYPE.Contribution, date: addDays(declaredAt(6), 10).toISOString(), description: 'Top-up investment (bank transfer)', amount: 500_000 });
  declare(5);
  payout('PO-1001', 100_000, addDays(declaredAt(5), 9));
  declare(4);
  add({
    investmentId: FLEET.id,
    type: LEDGER_ENTRY_TYPE.Adjustment,
    adjusts: ADJUSTMENT_TARGET.Dividends,
    date: addDays(declaredAt(4), 12).toISOString(),
    description: `Correction: ${periodLabel(declaredAt(4))} fleet revenue restated after the audit`,
    amount: -2_500
  });
  declare(3);
  payout('PO-1002', 200_000, addDays(declaredAt(3), 7));
  declare(2);
  declare(1);

  return { entries, requests: requests.reverse() };
}

const built = buildMock();

/** Oldest first. */
export const mockLedger: LedgerEntry[] = built.entries;
/** Newest first. */
export const mockPayoutRequests: PayoutRequest[] = built.requests;
