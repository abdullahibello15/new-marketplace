import { format, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { mockResponse } from '../../../services/mockApi';
import { EARNINGS_CHART_MONTHS, PAYOUT_STATUS, PLATFORM_FEE_RATE, RECENT_TRANSACTIONS_LIMIT, WEEK_STARTS_ON } from '../constants';
import { mockMonthlyHistory, mockTransactions, type MockTransaction } from '../mock/earnings';
import type { CompletedTransaction, EarningsOverview, MonthlyEarning } from '../types';

const netOf = (gross: number) => Math.round(gross * (1 - PLATFORM_FEE_RATE));

const toTransaction = (t: MockTransaction): CompletedTransaction => ({ ...t, netAmount: netOf(t.grossAmount) });

const sumNet = (list: CompletedTransaction[]) => list.reduce((sum, t) => sum + t.netAmount, 0);

/**
 * GET /vendor/earnings/overview?months=6&recent=8
 * The API does the aggregation; the client only formats. Amounts are net of the platform fee.
 */
export function getEarningsOverview(
months = EARNINGS_CHART_MONTHS,
recentLimit = RECENT_TRANSACTIONS_LIMIT)
: Promise<EarningsOverview> {
  return mockResponse(() => {
    const now = new Date();
    const transactions = mockTransactions.map(toTransaction).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const since = (start: Date) => transactions.filter((t) => new Date(t.completedAt) >= start);

    const thisMonth = sumNet(since(startOfMonth(now)));
    const thisWeek = sumNet(since(startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })));
    const pendingPayouts = sumNet(transactions.filter((t) => t.payoutStatus === PAYOUT_STATUS.Pending));
    const allTime = Object.values(mockMonthlyHistory).reduce((s, n) => s + n, 0) + thisMonth;

    const monthly: MonthlyEarning[] = Array.from({ length: months }, (_, i) => {
      const month = format(subMonths(now, months - 1 - i), 'yyyy-MM');
      const isCurrent = i === months - 1;
      return { month, total: isCurrent ? thisMonth : mockMonthlyHistory[month] ?? 0 };
    });

    return {
      summary: { thisWeek, thisMonth, allTime, pendingPayouts },
      monthly,
      transactions: transactions.slice(0, recentLimit)
    };
  });
}
