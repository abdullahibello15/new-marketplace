import { ApiError, mockResponse } from '../../../services/mockApi';
import { formatNaira } from '../../../utils/format';
import { DIVIDEND_RULES, MOCK_INVESTOR_CONFIG } from '../config';
import { LEDGER_ENTRY_TYPE, PAYOUT_REQUEST_STATUS } from '../constants';
import { mockInvestments, mockInvestor, mockLedger, mockPayoutRequests } from '../mock/investor';
import { allocatePayout, breakdownByInvestment, chronological, computeBalances, estimateNextDividend, nextDeclarationDate } from '../utils/ledger';
import type { InvestorDashboard, LedgerEntry, PayoutRequest } from '../types';

/*
 * The investor API (our backend, mocked). READ-ONLY for investors: nothing here edits or deletes a ledger
 * entry. The only writes are a payout request, and its approval (MOCK, by Gwani's team in production),
 * which appends Dividend paid entries. Every figure is calculated from the entries by utils/ledger.ts.
 * Real money movement and legal/tax reporting need a backend.
 */
let entries: readonly LedgerEntry[] = structuredClone(mockLedger);
let requests: PayoutRequest[] = structuredClone(mockPayoutRequests);
let nextRequest = 1003;

/** Appends only; existing entries are never touched. */
function append(added: Omit<LedgerEntry, 'id'>[]): void {
  entries = [...entries, ...added.map((e, i) => ({ ...e, id: `led-${entries.length + i + 1}` }))];
}

/**
 * MOCK approval: pays the request out of what's available now, split across stakes in proportion to what
 * each has available. Rejected if the money is no longer there (can't happen in this demo, but a backend must check).
 */
function approve(request: PayoutRequest, now: Date): void {
  const others = requests.filter((r) => r.id !== request.id);
  const { available } = computeBalances(entries, others.filter((r) => r.status === PAYOUT_REQUEST_STATUS.Pending));
  const decidedAt = now.toISOString();
  if (request.amount > available) {
    requests = requests.map((r) => r.id === request.id ? { ...r, status: PAYOUT_REQUEST_STATUS.Rejected, decidedAt, note: 'More than is available now.' } : r);
    return;
  }
  const parts = allocatePayout(request.amount, breakdownByInvestment(entries, mockInvestments));
  append(
    parts.map((p) => ({
      investorId: request.investorId,
      investmentId: p.investmentId,
      type: LEDGER_ENTRY_TYPE.DividendPaid,
      date: decidedAt,
      description: `Payout to ${request.payoutAccount} (request ${request.id})`,
      amount: -p.amount,
      payoutRequestId: request.id
    }))
  );
  requests = requests.map((r) => r.id === request.id ? { ...r, status: PAYOUT_REQUEST_STATUS.Approved, decidedAt } : r);
}

/** MOCK of the back office: approves requests that have waited long enough. Runs before every read. */
function approveDue(now = new Date()): void {
  const due = requests.filter((r) => r.status === PAYOUT_REQUEST_STATUS.Pending && now.getTime() - new Date(r.requestedAt).getTime() >= MOCK_INVESTOR_CONFIG.approvalDelaySeconds * 1000);
  for (const r of due) approve(r, now);
}

function dashboard(now = new Date()): InvestorDashboard {
  approveDue(now);
  const mine = chronological(entries.filter((e) => e.investorId === mockInvestor.id));
  const myRequests = requests.filter((r) => r.investorId === mockInvestor.id);
  const { estimate, basedOn } = estimateNextDividend(mine);
  return {
    investor: mockInvestor,
    investments: mockInvestments,
    entries: mine,
    payoutRequests: [...myRequests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    balances: computeBalances(mine, myRequests),
    breakdown: breakdownByInvestment(mine, mockInvestments),
    nextDividend: { nextDeclarationAt: nextDeclarationDate(now).toISOString(), estimate, basedOn }
  };
}

/** GET /investor/dashboard — the ledger, payout requests, and every figure calculated from them. */
export function getInvestorDashboard(): Promise<InvestorDashboard> {
  return mockResponse(() => dashboard(), MOCK_INVESTOR_CONFIG.latencyMs);
}

/**
 * POST /investor/payout-requests — asks for everything available (less anything already requested).
 * The amount is worked out here from the ledger, never sent by the browser. One request at a time.
 */
export function requestPayout(): Promise<PayoutRequest> {
  return mockResponse(() => {
    const d = dashboard();
    if (d.payoutRequests.some((r) => r.status === PAYOUT_REQUEST_STATUS.Pending)) {
      throw new ApiError('You already have a payout waiting for approval.', 409);
    }
    const amount = d.balances.requestable;
    if (amount < DIVIDEND_RULES.minimumPayout) {
      throw new ApiError(`The minimum payout is ${formatNaira(DIVIDEND_RULES.minimumPayout)}. You have ${formatNaira(amount)} available.`, 409);
    }
    const request: PayoutRequest = {
      id: `PO-${nextRequest++}`,
      investorId: d.investor.id,
      amount,
      status: PAYOUT_REQUEST_STATUS.Pending,
      requestedAt: new Date().toISOString(),
      decidedAt: null,
      payoutAccount: d.investor.payoutAccount,
      note: null
    };
    requests = [request, ...requests];
    return request;
  }, 600);
}

/** MOCK (demo controls only): approve a pending request now instead of waiting. */
export function approvePayoutNow(id: string): Promise<void> {
  return mockResponse(() => {
    const r = requests.find((x) => x.id === id && x.status === PAYOUT_REQUEST_STATUS.Pending);
    if (!r) throw new ApiError('That request isn’t waiting for approval.', 409);
    approve(r, new Date());
  }, 400);
}
