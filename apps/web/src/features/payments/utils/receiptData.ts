import { message, nested, type Message, type Text } from '../../../domain/message';
import { RECEIPT_ISSUER } from '../config';
import { ESCROW_CONFIG } from '../escrow/escrowConfig';
import { commissionFor, escrowTotals } from '../escrow/escrowRules';
import { ESCROW_EVENT, ESCROW_STATUS, PAYMENT_METHOD_META, PAYMENT_STATUS, TRANSACTION_STATUS } from '../constants';
import type {
  Escrow,
  Payment,
  ReceiptBreakdown,
  ReceiptCommission,
  ReceiptDocument,
  ReceiptKind,
  ReceiptLine,
  ReceiptSource,
  ReceiptViewer,
  TransactionStatus } from
'../types';

/*
 * THE receipt data mapping: payment + escrow + what was bought → the one receipt format that the screen,
 * the PDF, the customer's and the vendor's copies all render. Pure (no clock, no I/O); tested in
 * receiptData.test.ts. Amounts are whole Naira; `total` is always what was actually paid in.
 */


/** How the money moved. Bank and code only; never the payer's card or account details. */
export function methodLabel(payment: Pick<Payment, 'method' | 'transfer' | 'ussd' | 'cash'>): Message {
  if (payment.transfer) return message('payments:receipt.methodTransfer', { bank: payment.transfer.bankName });
  if (payment.ussd) return message('payments:receipt.methodUssd', { bank: payment.ussd.bankName });
  const method = payment.cash ? 'cash' : payment.method;
  return message(`payments:method.${method}`, undefined, PAYMENT_METHOD_META[method].label);
}

/**
 * How a payment reads in the transaction history: the payment status, then escrow for paid money.
 * Any refund (full or part) reads as Refunded; paid money still held (or held for a dispute) as Held in escrow.
 */
export function transactionStatusOf(payment: Pick<Payment, 'status'>, escrow: Pick<Escrow, 'status'> | null): TransactionStatus {
  switch (payment.status) {
    case PAYMENT_STATUS.Pending:
    case PAYMENT_STATUS.Processing:
      return TRANSACTION_STATUS.Pending;
    case PAYMENT_STATUS.Failed:
    case PAYMENT_STATUS.Expired:
      return TRANSACTION_STATUS.Failed;
    case PAYMENT_STATUS.Refunded:
      return TRANSACTION_STATUS.Refunded;
  }
  if (escrow?.status === ESCROW_STATUS.Refunded || escrow?.status === ESCROW_STATUS.PartiallyRefunded) return TRANSACTION_STATUS.Refunded;
  if (escrow?.status === ESCROW_STATUS.Held || escrow?.status === ESCROW_STATUS.Disputed) return TRANSACTION_STATUS.Held;
  return TRANSACTION_STATUS.Paid;
}

/** Only money that actually moved gets a receipt. */
export const hasReceipt = (payment: Pick<Payment, 'status'>) => payment.status === PAYMENT_STATUS.Paid || payment.status === PAYMENT_STATUS.Refunded;

/** Refunds, from the escrow ledger; a payment refunded outside escrow counts as one full refund. */
function refundLines(payment: Payment, escrow: Escrow | null): ReceiptLine[] {
  if (escrow) {
    return escrow.ledger.filter((e) => e.type === ESCROW_EVENT.Refunded).map((e) => ({ label: e.note ? message('payments:receipt.refundWith', { note: nested(e.note) }) : message('payments:receipt.refund'), amount: e.amount }));
  }
  return payment.status === PAYMENT_STATUS.Refunded ? [{ label: message('payments:receipt.refund'), amount: payment.amount }] : [];
}

/**
 * What was paid and what came back. If the items no longer add up to what was paid (e.g. the order
 * changed after payment), an adjustment line makes the difference visible instead of hiding it.
 */
export function buildReceiptBreakdown({ payment, escrow, items, deliveryFee, cancellationFee }: ReceiptSource): ReceiptBreakdown {
  const total = payment.amount;
  const itemsTotal = items.reduce((s, l) => s + l.amount, 0);
  const difference = total - itemsTotal - deliveryFee;
  const lines: ReceiptLine[] = items.length ? [...items] : [{ label: payment.description, amount: total - deliveryFee }];
  if (items.length && difference !== 0) lines.push({ label: difference > 0 ? message('payments:receipt.otherCharges') : message('payments:receipt.adjustment'), amount: difference });

  const refunds = refundLines(payment, escrow);
  const refundedTotal = Math.min(total, refunds.reduce((s, l) => s + l.amount, 0));
  // A cancellation fee only matters once money has come back: it's the part that wasn't refunded.
  const fee = refundedTotal > 0 ? Math.min(cancellationFee, total - refundedTotal) : 0;
  return {
    items: lines,
    deliveryFee,
    fees: fee > 0 ? [{ label: message('payments:receipt.lateFeeKept'), amount: fee }] : [],
    total,
    refunds,
    refundedTotal,
    netPaid: total - refundedTotal
  };
}

/**
 * Vendor copies: commission taken on what was released, plus what release will cost on anything still
 * held (marked estimated). Cash never goes through escrow, so no commission is taken on it.
 */
export function buildCommission(escrow: Escrow | null, breakdown: ReceiptBreakdown, rate: number): ReceiptCommission {
  if (!escrow) return { rate, amount: 0, vendorNet: breakdown.netPaid, estimated: false };
  const t = escrowTotals(escrow);
  const pendingCommission = commissionFor(t.held, rate);
  return { rate, amount: t.commission + pendingCommission, vendorNet: t.vendorNet + t.held - pendingCommission, estimated: t.held > 0 };
}

/** "RCT-SEED-2284" for receipts, "RFN-…" for refund notes: stable, so a re-download has the same number. */
export function receiptNumberFor(reference: string, kind: ReceiptKind): string {
  return `${kind === 'refund_note' ? 'RFN' : 'RCT'}-${reference.replace(/^GW-/, '')}`;
}

export interface ReceiptOptions {
  commissionRate?: number;
  issuer?: ReceiptDocument['platform'];
}

/** THE mapping: one receipt document for either side. Vendors' copies add the commission breakdown. */
export function buildReceiptDocument(source: ReceiptSource, viewer: ReceiptViewer, options: ReceiptOptions = {}): ReceiptDocument {
  const { payment, escrow } = source;
  const breakdown = buildReceiptBreakdown(source);
  const fullyRefunded = breakdown.total > 0 && breakdown.refundedTotal >= breakdown.total;
  const kind: ReceiptKind = fullyRefunded ? 'refund_note' : 'receipt';
  const lastRefundAt = escrow ? [...escrow.ledger].reverse().find((e) => e.type === ESCROW_EVENT.Refunded)?.at : undefined;
  const status = transactionStatusOf(payment, escrow);

  const notes: Text[] = [];
  if (escrow?.status === ESCROW_STATUS.Disputed) notes.push(message('payments:receipt.noteDisputed'));else
  if (status === TRANSACTION_STATUS.Held) notes.push(message('payments:receipt.noteHeld'));
  // Outcome texts are written to the customer ("returned to you"), so only their copy shows them.
  if (payment.outcome && viewer === 'customer') notes.push(payment.outcome);
  if (viewer === 'vendor' && !escrow) notes.push(message('payments:receipt.noteCashVendor'));

  return {
    receiptNumber: receiptNumberFor(payment.reference, kind),
    kind,
    title: message(fullyRefunded ? 'payments:receipt.titleRefund' : breakdown.refundedTotal > 0 ? 'payments:receipt.titleBoth' : 'payments:receipt.titleReceipt'),
    viewer,
    issuedAt: fullyRefunded && lastRefundAt ? lastRefundAt : payment.paidAt ?? payment.updatedAt,
    paidAt: payment.paidAt,
    platform: options.issuer ?? { ...RECEIPT_ISSUER },
    customerName: payment.customerName,
    vendor: source.vendor,
    description: payment.description,
    subject: payment.subject,
    reference: payment.reference,
    method: payment.method,
    methodLabel: methodLabel(payment),
    status,
    breakdown,
    commission: viewer === 'vendor' ? buildCommission(escrow, breakdown, options.commissionRate ?? ESCROW_CONFIG.commissionRate) : null,
    notes
  };
}
