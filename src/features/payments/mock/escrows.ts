import { JOB_STATUS } from '../../jobs/constants';
import { ORDER_STATUS } from '../../orders/constants';
import { applyEscrowDecision, jobEscrowDecision, openEscrow, orderEscrowDecision, payOutEscrow } from '../escrow/escrowRules';
import { mockJobs } from '../../jobs/mock/jobs';
import { mockOrders } from '../../orders/mock/orders';
import { mockPayments } from './payments';
import type { Escrow } from '../types';

/*
 * Escrow for the seeded online payments, built with the real rules so the ledger is consistent.
 * Times are relative to now. Cash payments have no escrow.
 */
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const DAY = 24;

function held(reference: string, hoursAgo: number): Escrow {
  const payment = mockPayments.find((p) => p.reference === reference);
  if (!payment) throw new Error(`Missing seed payment ${reference}`);
  return openEscrow(payment, ago(hoursAgo));
}

const released = (e: Escrow, hoursAgo: number) =>
applyEscrowDecision(e, jobEscrowDecision({ from: JOB_STATUS.AwaitingConfirmation, to: JOB_STATUS.Completed, cancellationFee: 0, disputeRefund: null }, e.gross), ago(hoursAgo));

const disputed = (e: Escrow, hoursAgo: number) =>
applyEscrowDecision(e, jobEscrowDecision({ from: JOB_STATUS.InProgress, to: JOB_STATUS.Disputed, cancellationFee: 0, disputeRefund: null }, e.gross), ago(hoursAgo));

const baseEscrows: Escrow[] = [
// Hauwa: an old job, released and paid out.
payOutEscrow(released(held('GW-SEED-2284', 13 * DAY), 5 * DAY), ago(3 * DAY)),
// Hauwa: work done over 48 hours ago and not confirmed: releases automatically on the next read.
held('GW-SEED-2293', 6 * DAY),
// Hauwa: retail order ready for pickup, held.
held('GW-SEED-5007', 47),
// Fatima: delivered order, held until Aisha confirms receipt.
held('GW-SEED-5006', 47),
// Fatima: sold out after payment, refunded in full.
applyEscrowDecision(
  held('GW-SEED-5002', 9 * DAY + 1),
  orderEscrowDecision({ from: ORDER_STATUS.Placed, to: ORDER_STATUS.OutOfStock, orderTotal: 0 }, 17000),
  ago(9 * DAY - 0.75)
),
// Ibrahim: Aisha cancelled late, so refunded less the ₦1,600 late-cancellation fee.
applyEscrowDecision(
  held('GW-SEED-2280', 27 * DAY - 2),
  jobEscrowDecision({ from: JOB_STATUS.Scheduled, to: JOB_STATUS.Cancelled, cancellationFee: 1600, disputeRefund: null }, 8000),
  ago(25 * DAY + 2)
),
// Bala (the demo vendor): one of each.
held('GW-SEED-2313', 1 * DAY),
disputed(held('GW-SEED-2316', 2 * DAY), 0.3),
payOutEscrow(released(held('GW-SEED-2318', 8 * DAY), 6 * DAY), ago(4 * DAY)),
released(held('GW-SEED-2319', 2 * DAY), 1 * DAY)];

/**
 * Escrow for the disputed jobs and orders (payments GW-DSP-…), built with the real rules: held when paid,
 * held for the dispute when the problem was reported, then settled if Gwani has already decided.
 */
function disputeEscrows(): Escrow[] {
  const escrowFor = (reference: string): Escrow | null => {
    const payment = mockPayments.find((p) => p.reference === reference);
    return payment ? openEscrow(payment, payment.paidAt ?? payment.createdAt) : null;
  };
  const forJobs = mockJobs.flatMap((j) => {
    let e = j.dispute ? escrowFor(`GW-DSP-J${j.id}`) : null;
    if (!e || !j.dispute) return [];
    e = applyEscrowDecision(e, jobEscrowDecision({ from: JOB_STATUS.InProgress, to: JOB_STATUS.Disputed, cancellationFee: 0, disputeRefund: null }, e.gross), j.dispute.at);
    const r = j.dispute.resolution;
    if (r) {
      const to = r.outcome === 'refund' ? JOB_STATUS.Cancelled : JOB_STATUS.Completed;
      e = applyEscrowDecision(e, jobEscrowDecision({ from: JOB_STATUS.Disputed, to, cancellationFee: 0, disputeRefund: r.refundAmount }, e.gross), r.at);
    }
    return [e];
  });
  const forOrders = mockOrders.flatMap((o) => {
    let e = o.dispute ? escrowFor(`GW-DSP-O${o.id}`) : null;
    if (!e || !o.dispute) return [];
    e = applyEscrowDecision(e, orderEscrowDecision({ from: ORDER_STATUS.Delivered, to: ORDER_STATUS.Disputed, orderTotal: o.total }, e.gross), o.dispute.at);
    const r = o.dispute.resolution;
    if (r) {
      const to = r.outcome === 'refund' ? ORDER_STATUS.Cancelled : ORDER_STATUS.Completed;
      e = applyEscrowDecision(e, orderEscrowDecision({ from: ORDER_STATUS.Disputed, to, orderTotal: o.total, disputeRefund: r.refundAmount }, e.gross), r.at);
    }
    return [e];
  });
  return [...forJobs, ...forOrders];
}

export const mockEscrows: Escrow[] = [...baseEscrows, ...disputeEscrows()];
