import { format, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { vendorAccount } from '../../../data/vendorPortal';
import { mockResponse } from '../../../services/mockApi';
import { ESCROW_EVENT, ESCROW_STATUS } from '../../payments/constants';
import { commissionFor, earningsBuckets, escrowTotals } from '../../payments/escrow/escrowRules';
import { payOutVendorEscrow, vendorEscrows } from '../../payments/services/escrowService';
import { EARNING_STAGE, EARNINGS_CHART_MONTHS, PAYOUT_STATUS, RECENT_TRANSACTIONS_LIMIT, WEEK_STARTS_ON } from '../constants';
import { mockMonthlyHistory, mockTransactions, type MockTransaction } from '../mock/earnings';
import type { Escrow } from '../../payments/types';
import type { CompletedTransaction, EarningStage, EarningsOverview, MonthlyEarning } from '../types';

/*
 * Earnings come from two places: the escrow ledger (every online payment since escrow) and a short
 * mock history from before it. Commission and buckets are worked out by the shared escrow rules.
 */
let history: MockTransaction[] = structuredClone(mockTransactions);

function fromHistory(t: MockTransaction): CompletedTransaction {
  const commission = commissionFor(t.grossAmount);
  return {
    id: t.id,
    customerName: t.customerName,
    item: t.item,
    completedAt: t.completedAt,
    grossAmount: t.grossAmount,
    commission,
    netAmount: t.grossAmount - commission,
    stage: t.payoutStatus === PAYOUT_STATUS.Paid ? EARNING_STAGE.PaidOut : EARNING_STAGE.Available,
    ledger: []
  };
}

function stageOf(e: Escrow): EarningStage {
  if (e.status === ESCROW_STATUS.Held) return EARNING_STAGE.Pending;
  if (e.status === ESCROW_STATUS.Disputed) return EARNING_STAGE.OnHold;
  if (e.status === ESCROW_STATUS.Refunded) return EARNING_STAGE.Refunded;
  const unpaid = e.ledger.some((l) => l.type === ESCROW_EVENT.Released && l.paidOutAt === null);
  return unpaid ? EARNING_STAGE.Available : EARNING_STAGE.PaidOut;
}

function fromEscrow(e: Escrow): CompletedTransaction {
  const t = escrowTotals(e);
  // Still held: show what the vendor will get at release. Settled: what they actually got.
  const commission = t.held > 0 ? commissionFor(t.held) + t.commission : t.commission;
  const net = t.held > 0 ? t.held - commissionFor(t.held) + t.vendorNet : t.vendorNet;
  return {
    id: e.paymentReference,
    customerName: e.customerName,
    item: e.description,
    completedAt: e.ledger[e.ledger.length - 1].at,
    grossAmount: e.gross,
    commission,
    netAmount: net,
    stage: stageOf(e),
    ledger: e.ledger
  };
}

/** Net released to the vendor on or after `start`, from escrow releases and the older history. */
function releasedSince(escrows: Escrow[], start: Date): number {
  const fromLedger = escrows.flatMap((e) => e.ledger).filter((l) => l.type === ESCROW_EVENT.Released && new Date(l.at) >= start).reduce((s, l) => s + l.amount - l.commission, 0);
  const fromOld = history.filter((t) => new Date(t.completedAt) >= start).reduce((s, t) => s + fromHistory(t).netAmount, 0);
  return fromLedger + fromOld;
}

/**
 * GET /vendor/earnings/overview?months=6&recent=8
 * Pending (held), Available (released) and Paid out, plus period totals and recent transactions, all net of commission.
 */
export function getEarningsOverview(
months = EARNINGS_CHART_MONTHS,
recentLimit = RECENT_TRANSACTIONS_LIMIT,
vendorId = vendorAccount.vendorId)
: Promise<EarningsOverview> {
  return mockResponse(() => {
    const now = new Date();
    const escrows = vendorEscrows(vendorId);
    const oldOnes = history.map(fromHistory);
    const transactions = [...escrows.map(fromEscrow), ...oldOnes].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const buckets = earningsBuckets(escrows);
    const oldAvailable = oldOnes.filter((t) => t.stage === EARNING_STAGE.Available).reduce((s, t) => s + t.netAmount, 0);
    const oldPaid = oldOnes.filter((t) => t.stage === EARNING_STAGE.PaidOut).reduce((s, t) => s + t.netAmount, 0);

    const thisMonth = releasedSince(escrows, startOfMonth(now));
    const monthly: MonthlyEarning[] = Array.from({ length: months }, (_, i) => {
      const month = format(subMonths(now, months - 1 - i), 'yyyy-MM');
      return { month, total: i === months - 1 ? thisMonth : mockMonthlyHistory[month] ?? 0 };
    });

    return {
      summary: {
        thisWeek: releasedSince(escrows, startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON })),
        thisMonth,
        allTime: Object.values(mockMonthlyHistory).reduce((s, n) => s + n, 0) + thisMonth,
        pending: buckets.pending,
        available: buckets.available + oldAvailable,
        paidOut: buckets.paidOut + oldPaid
      },
      monthly,
      transactions: transactions.slice(0, recentLimit)
    };
  });
}

/** POST /vendor/payouts — sends the whole Available balance to the vendor's bank (MOCK). Resolves with the amount sent. */
export function requestPayout(vendorId = vendorAccount.vendorId): Promise<number> {
  return mockResponse(() => {
    const fromEscrow = payOutVendorEscrow(vendorId);
    const fromOld = history.filter((t) => t.payoutStatus === PAYOUT_STATUS.Pending).reduce((s, t) => s + fromHistory(t).netAmount, 0);
    history = history.map((t) => ({ ...t, payoutStatus: PAYOUT_STATUS.Paid }));
    return fromEscrow + fromOld;
  }, 800);
}
