import { ApiError, mockResponse } from '../../../services/mockApi';
import { PAYMENT_SUBJECT } from '../constants';
import { ESCROW_CONFIG } from '../escrow/escrowConfig';
import { applyEscrowDecision, escrowTotals, holdDecision, jobEscrowDecision, openEscrow, orderEscrowDecision, payOutEscrow } from '../escrow/escrowRules';
import { mockEscrows } from '../mock/escrows';
import type { Job, JobStatus } from '../../jobs/types';
import type { Order, OrderStatus } from '../../orders/types';
import type { Escrow, Payment, PaymentSubjectRef } from '../types';

/*
 * MOCK escrow ledger (our backend's side). All amounts and statuses come from escrowRules; this file
 * only stores escrows and calls those rules when payments land or jobs and orders change status.
 * The job and order services call applyJobEscrowChange / applyOrderEscrowChange from their single
 * transition function, so every status change is seen exactly once.
 */
let escrows: Escrow[] = structuredClone(mockEscrows);

const sameSubject = (a: PaymentSubjectRef, b: PaymentSubjectRef) => a.kind === b.kind && a.id === b.id;

function save(updated: Escrow): Escrow {
  escrows = escrows.map((e) => e.paymentReference === updated.paymentReference ? updated : e);
  return updated;
}

/* ---------- Called by the payment, job and order services ---------- */

/** Escrow for a payment reference, if it has one (cash never does). */
export function escrowForPayment(reference: string): Escrow | null {
  return escrows.find((e) => e.paymentReference === reference) ?? null;
}

/**
 * A verified online payment: hold it. If the job or order was already fulfilled, release at once.
 * Idempotent: a payment is only ever held once. Cash skips escrow.
 */
export function holdFunds(payment: Payment, fulfilled: boolean, at = new Date().toISOString()): Escrow | null {
  if (!ESCROW_CONFIG.heldMethods.includes(payment.method)) return null;
  const existing = escrowForPayment(payment.reference);
  if (existing) return existing;
  const opened = applyEscrowDecision(openEscrow(payment, at), holdDecision(fulfilled), at);
  escrows = [opened, ...escrows];
  return opened;
}

function applyToSubject(subject: PaymentSubjectRef, decide: (held: number) => Parameters<typeof applyEscrowDecision>[1], at: string): void {
  for (const e of escrows.filter((x) => sameSubject(x.subject, subject))) {
    const { held } = escrowTotals(e);
    if (held > 0) save(applyEscrowDecision(e, decide(held), at));
  }
}

/** A job changed status: release, refund (less any cancellation fee), or hold for a dispute. */
export function applyJobEscrowChange(job: Job, from: JobStatus, at = job.updatedAt): void {
  applyToSubject(
    { kind: PAYMENT_SUBJECT.Job, id: job.id },
    (held) =>
    jobEscrowDecision(
      { from, to: job.status, cancellationFee: job.cancellation?.fee ?? 0, disputeRefund: job.dispute?.resolution?.refundAmount ?? null },
      held
    ),
    at
  );
}

/** An order changed status: release on completion, refund if it ended or items were dropped. */
export function applyOrderEscrowChange(order: Order, from: OrderStatus, at = order.updatedAt): void {
  applyToSubject({ kind: PAYMENT_SUBJECT.Order, id: order.id }, (held) => orderEscrowDecision({ from, to: order.status, orderTotal: order.total }, held), at);
}

/** Everything a vendor has in escrow (for the earnings dashboard). */
export function vendorEscrows(vendorId: string): Escrow[] {
  return escrows.filter((e) => e.vendorId === vendorId);
}

/* ---------- API ---------- */

/** GET /vendor/escrow */
export function listVendorEscrows(vendorId: string): Promise<Escrow[]> {
  return mockResponse(() => vendorEscrows(vendorId).sort((a, b) => b.ledger[b.ledger.length - 1].at.localeCompare(a.ledger[a.ledger.length - 1].at)), 300);
}

/** POST /vendor/payouts — sends everything released (Available) to the vendor's bank. Returns the net amount. */
export function payOutVendorEscrow(vendorId: string, at = new Date().toISOString()): number {
  let total = 0;
  for (const e of vendorEscrows(vendorId)) {
    const before = e.ledger.length;
    const paid = payOutEscrow(e, at);
    if (paid.ledger.length > before) {
      total += paid.ledger[paid.ledger.length - 1].amount;
      save(paid);
    }
  }
  return total;
}

/** GET /escrow/:reference */
export function getEscrow(reference: string): Promise<Escrow> {
  return mockResponse(() => {
    const e = escrowForPayment(reference);
    if (!e) throw new ApiError('No escrow for that payment.', 404);
    return e;
  }, 200);
}
