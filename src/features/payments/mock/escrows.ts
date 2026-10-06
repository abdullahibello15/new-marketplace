import { JOB_STATUS } from '../../jobs/constants';
import { applyEscrowDecision, jobEscrowDecision, openEscrow, payOutEscrow } from '../escrow/escrowRules';
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

export const mockEscrows: Escrow[] = [
// Hauwa: an old job, released and paid out.
payOutEscrow(released(held('GW-SEED-2284', 13 * DAY), 5 * DAY), ago(3 * DAY)),
// Hauwa: work done over 48 hours ago and not confirmed: releases automatically on the next read.
held('GW-SEED-2293', 6 * DAY),
// Hauwa: retail order ready for pickup, held.
held('GW-SEED-5007', 47),
// Bala (the demo vendor): one of each.
held('GW-SEED-2313', 1 * DAY),
disputed(held('GW-SEED-2316', 2 * DAY), 0.3),
payOutEscrow(released(held('GW-SEED-2318', 8 * DAY), 6 * DAY), ago(4 * DAY)),
released(held('GW-SEED-2319', 2 * DAY), 1 * DAY)];
