import { addHours } from 'date-fns';
import { formatNaira } from '../../../utils/format';
import { JOB_STATUS } from '../../jobs/constants';
import { ORDER_STATUS } from '../../orders/constants';
import { ESCROW_EVENT, ESCROW_STATUS, PAYMENT_SUBJECT } from '../constants';
import { ESCROW_CONFIG } from './escrowConfig';
import type { JobStatus } from '../../jobs/types';
import type { OrderStatus } from '../../orders/types';
import type { EarningsBuckets, Escrow, EscrowLedgerEntry, EscrowStatus, EscrowTotals, Payment, PaymentSubjectKind } from '../types';

/*
 * Escrow money rules. Pure functions only: no state, no dates read from the clock, no I/O. The escrow
 * service applies them; escrowRules.test.ts covers them. Amounts are whole Naira throughout.
 */

/** What should happen to the money held for a payment. */
export type EscrowDecision =
{kind: 'none';} |
/** Release everything still held to the vendor (less commission). */
{kind: 'release';note: string;} |
/** Return `amount` to the customer; anything left stays held. */
{kind: 'refund';amount: number;note: string;} |
/** Return `refund` to the customer and release the rest to the vendor. */
{kind: 'settle';refund: number;note: string;} |
/** Keep holding while a problem is reviewed. */
{kind: 'dispute';note: string;};

const NONE: EscrowDecision = { kind: 'none' };

/** Commission on an amount being released, rounded to the nearest Naira. */
export function commissionFor(amount: number, rate: number = ESCROW_CONFIG.commissionRate): number {
  return Math.round(amount * rate);
}

/* ---------- Decisions ---------- */

export interface JobEscrowChange {
  from: JobStatus;
  to: JobStatus;
  /** The fee the cancellation policy charged (0 if none, e.g. the vendor cancelled). */
  cancellationFee: number;
  /** Set when Gwani resolved a dispute by refunding part of the money. */
  disputeRefund: number | null;
}

/** Job status changes → escrow. Completion releases; cancellation refunds (less any fee); a dispute holds. */
export function jobEscrowDecision(change: JobEscrowChange, held: number): EscrowDecision {
  if (held <= 0 || change.from === change.to) return NONE;
  switch (change.to) {
    case JOB_STATUS.Completed:
      if (change.from === JOB_STATUS.Disputed && change.disputeRefund !== null && change.disputeRefund > 0) {
        return { kind: 'settle', refund: Math.min(change.disputeRefund, held), note: 'Dispute resolved: part refunded to the customer, the rest released' };
      }
      return { kind: 'release', note: change.from === JOB_STATUS.Disputed ? 'Dispute resolved in the vendor’s favour' : 'Job confirmed complete' };
    case JOB_STATUS.Cancelled:{
        if (change.from === JOB_STATUS.Disputed) return { kind: 'refund', amount: held, note: 'Dispute resolved: full refund to the customer' };
        const fee = Math.min(Math.max(0, change.cancellationFee), held);
        return fee > 0 ?
        { kind: 'settle', refund: held - fee, note: `Cancelled: refunded less the ${formatNaira(fee)} late-cancellation fee` } :
        { kind: 'refund', amount: held, note: 'Cancelled before the job started: full refund' };
      }
    case JOB_STATUS.Disputed:
      return { kind: 'dispute', note: 'Problem reported: held until Gwani’s team resolves it' };
    default:
      return NONE;
  }
}

export interface OrderEscrowChange {
  from: OrderStatus;
  to: OrderStatus;
  /** The order total after this change (it drops when the vendor marks items out of stock). */
  orderTotal: number;
}

const ORDER_ENDED: readonly OrderStatus[] = [ORDER_STATUS.Cancelled, ORDER_STATUS.Declined, ORDER_STATUS.OutOfStock];

/** Order status changes → escrow. Completion releases; ending early refunds; dropped items are refunded at once. */
export function orderEscrowDecision(change: OrderEscrowChange, held: number): EscrowDecision {
  if (held <= 0 || change.from === change.to) return NONE;
  if (change.to === ORDER_STATUS.Completed) return { kind: 'release', note: 'Order received' };
  if (ORDER_ENDED.includes(change.to)) return { kind: 'refund', amount: held, note: 'Order didn’t go ahead: full refund' };
  if (change.to === ORDER_STATUS.Confirmed && change.orderTotal < held) {
    return { kind: 'refund', amount: held - Math.max(0, change.orderTotal), note: 'Out-of-stock items refunded' };
  }
  return NONE;
}

/** Money paid for something already fulfilled (e.g. paying after the job was confirmed) is released straight away. */
export const holdDecision = (fulfilled: boolean): EscrowDecision => fulfilled ? { kind: 'release', note: 'Paid after completion' } : NONE;

/* ---------- Ledger ---------- */

export function escrowTotals(escrow: Pick<Escrow, 'gross' | 'ledger'>): EscrowTotals {
  const sum = (type: EscrowLedgerEntry['type'], key: 'amount' | 'commission' = 'amount') =>
  escrow.ledger.filter((e) => e.type === type).reduce((s, e) => s + e[key], 0);
  const released = sum(ESCROW_EVENT.Released);
  const refunded = sum(ESCROW_EVENT.Refunded);
  const commission = sum(ESCROW_EVENT.Released, 'commission');
  return { held: Math.max(0, escrow.gross - released - refunded), released, refunded, commission, vendorNet: released - commission };
}

/** Status follows from the ledger, so it can never disagree with the amounts. */
export function deriveEscrowStatus(escrow: Pick<Escrow, 'gross' | 'ledger'>): EscrowStatus {
  const t = escrowTotals(escrow);
  if (t.held > 0) {
    const last = [...escrow.ledger].reverse().find((e) => e.type === ESCROW_EVENT.Disputed || e.type === ESCROW_EVENT.Released || e.type === ESCROW_EVENT.Refunded);
    return last?.type === ESCROW_EVENT.Disputed ? ESCROW_STATUS.Disputed : ESCROW_STATUS.Held;
  }
  if (t.refunded >= escrow.gross) return ESCROW_STATUS.Refunded;
  if (t.refunded > 0) return ESCROW_STATUS.PartiallyRefunded;
  return ESCROW_STATUS.Released;
}

function entry(escrow: Escrow, type: EscrowLedgerEntry['type'], amount: number, at: string, note: string | null, commission = 0): EscrowLedgerEntry {
  return { id: `${escrow.paymentReference}-${escrow.ledger.length + 1}`, type, at, amount, commission, note, paidOutAt: null };
}

function append(escrow: Escrow, e: EscrowLedgerEntry): Escrow {
  const next = { ...escrow, ledger: [...escrow.ledger, e] };
  return { ...next, status: deriveEscrowStatus(next) };
}

/** A new escrow holding the whole payment. */
export function openEscrow(payment: Pick<Payment, 'reference' | 'subject' | 'vendorId' | 'vendorName' | 'customerName' | 'description' | 'method' | 'amount'>, at: string): Escrow {
  const base: Escrow = {
    paymentReference: payment.reference,
    subject: payment.subject,
    vendorId: payment.vendorId,
    vendorName: payment.vendorName,
    customerName: payment.customerName,
    description: payment.description,
    method: payment.method,
    gross: payment.amount,
    status: ESCROW_STATUS.Held,
    ledger: []
  };
  return append(base, entry(base, ESCROW_EVENT.Held, payment.amount, at, 'Paid in and held securely'));
}

/** Applies a decision. Never moves more than is still held, and commission is only ever taken on releases. */
export function applyEscrowDecision(escrow: Escrow, decision: EscrowDecision, at: string): Escrow {
  const { held } = escrowTotals(escrow);
  if (decision.kind === 'none' || held <= 0) return escrow;
  switch (decision.kind) {
    case 'release':
      return append(escrow, entry(escrow, ESCROW_EVENT.Released, held, at, decision.note, commissionFor(held)));
    case 'refund':{
        const amount = Math.min(Math.max(0, decision.amount), held);
        return amount > 0 ? append(escrow, entry(escrow, ESCROW_EVENT.Refunded, amount, at, decision.note)) : escrow;
      }
    case 'settle':{
        const refund = Math.min(Math.max(0, decision.refund), held);
        const refunded = refund > 0 ? append(escrow, entry(escrow, ESCROW_EVENT.Refunded, refund, at, decision.note)) : escrow;
        const rest = held - refund;
        return rest > 0 ? append(refunded, entry(refunded, ESCROW_EVENT.Released, rest, at, decision.note, commissionFor(rest))) : refunded;
      }
    case 'dispute':
      return append(escrow, entry(escrow, ESCROW_EVENT.Disputed, held, at, decision.note));
  }
}

/** Pays out everything released and not yet paid: marks those entries and records one paid_out line (net). */
export function payOutEscrow(escrow: Escrow, at: string): Escrow {
  const unpaid = escrow.ledger.filter((e) => e.type === ESCROW_EVENT.Released && e.paidOutAt === null);
  if (unpaid.length === 0) return escrow;
  const net = unpaid.reduce((s, e) => s + e.amount - e.commission, 0);
  const marked = { ...escrow, ledger: escrow.ledger.map((e) => unpaid.includes(e) ? { ...e, paidOutAt: at } : e) };
  return append(marked, entry(marked, ESCROW_EVENT.PaidOut, net, at, 'Sent to the vendor’s bank account'));
}

/* ---------- Vendor earnings ---------- */

/**
 * Splits a vendor's escrow money into Pending (still held, shown net of the commission it will cost),
 * Available (released, not yet paid out) and Paid out. All net of commission.
 */
export function earningsBuckets(escrows: readonly Escrow[]): EarningsBuckets {
  return escrows.reduce<EarningsBuckets>(
    (b, escrow) => {
      const { held } = escrowTotals(escrow);
      const released = escrow.ledger.filter((e) => e.type === ESCROW_EVENT.Released);
      const net = (list: EscrowLedgerEntry[]) => list.reduce((s, e) => s + e.amount - e.commission, 0);
      return {
        pending: b.pending + held - commissionFor(held),
        available: b.available + net(released.filter((e) => e.paidOutAt === null)),
        paidOut: b.paidOut + net(released.filter((e) => e.paidOutAt !== null))
      };
    },
    { pending: 0, available: 0, paidOut: 0 }
  );
}

/** When held money releases on its own if the customer doesn't respond: hours after the vendor marked it done/delivered. */
export function autoReleaseAt(kind: PaymentSubjectKind, doneAt: Date): Date {
  return addHours(doneAt, kind === PAYMENT_SUBJECT.Job ? ESCROW_CONFIG.jobAutoReleaseHours : ESCROW_CONFIG.orderAutoReleaseHours);
}
