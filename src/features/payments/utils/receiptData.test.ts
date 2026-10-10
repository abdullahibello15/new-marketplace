import { describe, expect, it } from 'vitest';
import { JOB_STATUS } from '../../jobs/constants';
import { ORDER_STATUS } from '../../orders/constants';
import { ESCROW_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_SUBJECT, TRANSACTION_STATUS } from '../constants';
import { applyEscrowDecision, jobEscrowDecision, openEscrow, orderEscrowDecision, payOutEscrow } from '../escrow/escrowRules';
import {
  buildReceiptBreakdown,
  buildReceiptDocument,
  formatSignedNaira,
  hasReceipt,
  methodLabel,
  receiptNumberFor,
  transactionStatusOf } from
'./receiptData';
import type { Escrow, Payment, ReceiptSource } from '../types';

const T0 = '2026-10-01T10:00:00.000Z';
const T1 = '2026-10-02T10:00:00.000Z';
const T2 = '2026-10-03T10:00:00.000Z';
const ISSUER = { name: 'Gwani', address: 'Minna', website: 'gwani.test', email: 'help@gwani.test' };
const RATE = 0.05;

function payment(over: Partial<Payment> = {}): Payment {
  return {
    reference: 'GW-TEST-1',
    subject: { kind: PAYMENT_SUBJECT.Order, id: '5001' },
    vendorId: 'v1',
    vendorName: 'Bala Plumbing Services',
    customerId: 'c1',
    customerName: 'Aisha Mohammed',
    description: 'Order #5001',
    amount: 20_500,
    method: PAYMENT_METHOD.Card,
    status: PAYMENT_STATUS.Paid,
    createdAt: T0,
    updatedAt: T0,
    expiresAt: null,
    paidAt: T0,
    amountReceived: 20_500,
    outcome: null,
    transfer: null,
    ussd: null,
    cash: null,
    reviewFlag: null,
    ...over
  };
}

const held = (p: Payment): Escrow => openEscrow(p, T0);
const released = (e: Escrow) => applyEscrowDecision(e, orderEscrowDecision({ from: ORDER_STATUS.Delivered, to: ORDER_STATUS.Completed, orderTotal: e.gross }, e.gross), T1);

function source(over: Partial<ReceiptSource> = {}): ReceiptSource {
  const p = over.payment ?? payment();
  return {
    payment: p,
    escrow: null,
    items: [
    { label: '2 × Kitchen mixer tap', amount: 19_000 }],

    deliveryFee: 1_500,
    cancellationFee: 0,
    vendor: { name: 'Bala Plumbing Services', trade: 'Plumbing', location: 'Chanchaga LGA, Niger State' },
    ...over
  };
}

describe('formatSignedNaira', () => {
  it('formats positives as Naira and puts the minus sign before ₦', () => {
    expect(formatSignedNaira(18_500)).toBe('₦18,500');
    expect(formatSignedNaira(-1_500)).toBe('−₦1,500');
    expect(formatSignedNaira(0)).toBe('₦0');
  });
});

describe('transactionStatusOf', () => {
  const p = payment();
  it('maps unpaid payment states', () => {
    expect(transactionStatusOf({ status: PAYMENT_STATUS.Pending }, null)).toBe(TRANSACTION_STATUS.Pending);
    expect(transactionStatusOf({ status: PAYMENT_STATUS.Processing }, null)).toBe(TRANSACTION_STATUS.Pending);
    expect(transactionStatusOf({ status: PAYMENT_STATUS.Failed }, null)).toBe(TRANSACTION_STATUS.Failed);
    expect(transactionStatusOf({ status: PAYMENT_STATUS.Expired }, null)).toBe(TRANSACTION_STATUS.Failed);
    expect(transactionStatusOf({ status: PAYMENT_STATUS.Refunded }, null)).toBe(TRANSACTION_STATUS.Refunded);
  });

  it('reads paid money through escrow', () => {
    expect(transactionStatusOf(p, held(p))).toBe(TRANSACTION_STATUS.Held);
    expect(transactionStatusOf(p, { status: ESCROW_STATUS.Disputed })).toBe(TRANSACTION_STATUS.Held);
    expect(transactionStatusOf(p, released(held(p)))).toBe(TRANSACTION_STATUS.Paid);
    expect(transactionStatusOf(p, { status: ESCROW_STATUS.PartiallyRefunded })).toBe(TRANSACTION_STATUS.Refunded);
    expect(transactionStatusOf(p, { status: ESCROW_STATUS.Refunded })).toBe(TRANSACTION_STATUS.Refunded);
  });

  it('treats paid cash (no escrow) as paid', () => {
    expect(transactionStatusOf(payment({ method: PAYMENT_METHOD.Cash }), null)).toBe(TRANSACTION_STATUS.Paid);
  });
});

describe('hasReceipt and receiptNumberFor', () => {
  it('only issues receipts for money that moved', () => {
    expect(hasReceipt({ status: PAYMENT_STATUS.Paid })).toBe(true);
    expect(hasReceipt({ status: PAYMENT_STATUS.Refunded })).toBe(true);
    expect(hasReceipt({ status: PAYMENT_STATUS.Pending })).toBe(false);
    expect(hasReceipt({ status: PAYMENT_STATUS.Failed })).toBe(false);
  });

  it('gives a stable number per reference and kind', () => {
    expect(receiptNumberFor('GW-SEED-5007', 'receipt')).toBe('RCT-SEED-5007');
    expect(receiptNumberFor('GW-SEED-5007', 'refund_note')).toBe('RFN-SEED-5007');
  });
});

describe('methodLabel', () => {
  it('names the bank for transfers and USSD, never payer details', () => {
    expect(methodLabel(payment())).toBe('Card');
    expect(methodLabel(payment({ method: PAYMENT_METHOD.Transfer, transfer: { bankName: 'Wema Bank', accountNumber: '9012448871', accountName: 'Gwani Checkout' } }))).toBe(
      'Bank transfer to Wema Bank'
    );
    expect(methodLabel(payment({ method: PAYMENT_METHOD.Ussd, ussd: { bankId: 'gtbank', bankName: 'GTBank', code: '*737*000*1#' } }))).toBe('USSD (GTBank)');
  });
});

describe('buildReceiptBreakdown', () => {
  it('lists items and delivery, totalling what was paid', () => {
    const b = buildReceiptBreakdown(source());
    expect(b.items).toEqual([{ label: '2 × Kitchen mixer tap', amount: 19_000 }]);
    expect(b.deliveryFee).toBe(1_500);
    expect(b.total).toBe(20_500);
    expect(b.refunds).toEqual([]);
    expect(b.fees).toEqual([]);
    expect(b.netPaid).toBe(20_500);
  });

  it('shows an adjustment line when the items no longer add up to what was paid', () => {
    const b = buildReceiptBreakdown(source({ items: [{ label: 'Tap', amount: 9_000 }] }));
    expect(b.items).toContainEqual({ label: 'Other charges', amount: 10_000 });
    const less = buildReceiptBreakdown(source({ items: [{ label: 'Tap', amount: 25_000 }] }));
    expect(less.items).toContainEqual({ label: 'Adjustment', amount: -6_000 });
  });

  it('falls back to one line for the description when there are no items', () => {
    const b = buildReceiptBreakdown(source({ items: [], deliveryFee: 0 }));
    expect(b.items).toEqual([{ label: 'Order #5001', amount: 20_500 }]);
  });

  it('takes refunds from the escrow ledger', () => {
    const p = payment();
    const escrow = applyEscrowDecision(held(p), orderEscrowDecision({ from: ORDER_STATUS.Placed, to: ORDER_STATUS.OutOfStock, orderTotal: 0 }, p.amount), T1);
    const b = buildReceiptBreakdown(source({ payment: p, escrow }));
    expect(b.refunds).toHaveLength(1);
    expect(b.refundedTotal).toBe(20_500);
    expect(b.netPaid).toBe(0);
  });

  it('shows the late-cancellation fee as the part that was not refunded', () => {
    const p = payment({ subject: { kind: PAYMENT_SUBJECT.Job, id: '2280' }, amount: 8_000, description: 'Job #2280' });
    const escrow = applyEscrowDecision(
      held(p),
      jobEscrowDecision({ from: JOB_STATUS.Scheduled, to: JOB_STATUS.Cancelled, cancellationFee: 1_600, disputeRefund: null }, p.amount),
      T1
    );
    const b = buildReceiptBreakdown(source({ payment: p, escrow, items: [{ label: 'Ceiling fan installation', amount: 8_000 }], deliveryFee: 0, cancellationFee: 1_600 }));
    expect(b.refundedTotal).toBe(6_400);
    expect(b.fees).toEqual([{ label: 'Late-cancellation fee (kept by the vendor)', amount: 1_600 }]);
    expect(b.netPaid).toBe(1_600);
  });

  it('ignores a cancellation fee when nothing was refunded', () => {
    expect(buildReceiptBreakdown(source({ cancellationFee: 1_600 })).fees).toEqual([]);
  });

  it('counts a refund made outside escrow as one full refund', () => {
    const b = buildReceiptBreakdown(source({ payment: payment({ status: PAYMENT_STATUS.Refunded }) }));
    expect(b.refunds).toEqual([{ label: 'Refund', amount: 20_500 }]);
    expect(b.netPaid).toBe(0);
  });
});

describe('buildReceiptDocument', () => {
  it('builds the customer copy with every receipt field and no commission', () => {
    const p = payment({ method: PAYMENT_METHOD.Ussd, ussd: { bankId: 'gtbank', bankName: 'GTBank', code: '*737#' } });
    const doc = buildReceiptDocument(source({ payment: p, escrow: released(held(p)) }), 'customer', { issuer: ISSUER });
    expect(doc).toMatchObject({
      receiptNumber: 'RCT-TEST-1',
      kind: 'receipt',
      title: 'Payment receipt',
      viewer: 'customer',
      issuedAt: T0,
      platform: ISSUER,
      customerName: 'Aisha Mohammed',
      vendor: { name: 'Bala Plumbing Services', trade: 'Plumbing', location: 'Chanchaga LGA, Niger State' },
      reference: 'GW-TEST-1',
      methodLabel: 'USSD (GTBank)',
      status: TRANSACTION_STATUS.Paid,
      commission: null
    });
    expect(doc.breakdown.total).toBe(20_500);
  });

  it('adds the commission breakdown to the vendor copy of the same data', () => {
    const p = payment();
    const s = source({ payment: p, escrow: payOutEscrow(released(held(p)), T2) });
    const customer = buildReceiptDocument(s, 'customer', { issuer: ISSUER, commissionRate: RATE });
    const vendor = buildReceiptDocument(s, 'vendor', { issuer: ISSUER, commissionRate: RATE });
    expect(vendor.breakdown).toEqual(customer.breakdown);
    expect(vendor.commission).toEqual({ rate: RATE, amount: 1_025, vendorNet: 19_475, estimated: false });
  });

  it('estimates commission on money still held', () => {
    const p = payment();
    const doc = buildReceiptDocument(source({ payment: p, escrow: held(p) }), 'vendor', { commissionRate: RATE });
    expect(doc.status).toBe(TRANSACTION_STATUS.Held);
    expect(doc.commission).toEqual({ rate: RATE, amount: 1_025, vendorNet: 19_475, estimated: true });
    expect(doc.notes[0]).toMatch(/escrow/);
  });

  it('takes no commission on cash and says so on the vendor copy', () => {
    const p = payment({ method: PAYMENT_METHOD.Cash, cash: { vendorAmount: 20_500, vendorConfirmedAt: T0, customerAmount: 20_500, customerConfirmedAt: T0 } });
    const doc = buildReceiptDocument(source({ payment: p }), 'vendor', { commissionRate: RATE });
    expect(doc.commission).toEqual({ rate: RATE, amount: 0, vendorNet: 20_500, estimated: false });
    expect(doc.notes.some((n) => n.includes('no commission'))).toBe(true);
  });

  it('becomes a refund note, dated at the refund, when everything came back', () => {
    const p = payment();
    const escrow = applyEscrowDecision(held(p), orderEscrowDecision({ from: ORDER_STATUS.Placed, to: ORDER_STATUS.Cancelled, orderTotal: 0 }, p.amount), T1);
    const doc = buildReceiptDocument(source({ payment: p, escrow }), 'customer', { issuer: ISSUER });
    expect(doc.kind).toBe('refund_note');
    expect(doc.title).toBe('Refund note');
    expect(doc.receiptNumber).toBe('RFN-TEST-1');
    expect(doc.issuedAt).toBe(T1);
    expect(doc.status).toBe(TRANSACTION_STATUS.Refunded);
  });

  it('stays a receipt with a refund section after a part refund', () => {
    const p = payment({ subject: { kind: PAYMENT_SUBJECT.Job, id: '2280' }, amount: 8_000 });
    const escrow = applyEscrowDecision(
      held(p),
      jobEscrowDecision({ from: JOB_STATUS.Scheduled, to: JOB_STATUS.Cancelled, cancellationFee: 1_600, disputeRefund: null }, p.amount),
      T1
    );
    const doc = buildReceiptDocument(source({ payment: p, escrow, items: [{ label: 'Fan', amount: 8_000 }], deliveryFee: 0, cancellationFee: 1_600 }), 'vendor', {
      commissionRate: RATE
    });
    expect(doc.kind).toBe('receipt');
    expect(doc.title).toBe('Payment receipt and refund note');
    // The vendor keeps the fee, less commission on it.
    expect(doc.commission).toEqual({ rate: RATE, amount: 80, vendorNet: 1_520, estimated: false });
  });

  it('shows the customer-facing outcome on the customer copy only', () => {
    const p = payment({ outcome: 'You sent ₦1,000 more than needed.' });
    expect(buildReceiptDocument(source({ payment: p }), 'customer').notes).toContain('You sent ₦1,000 more than needed.');
    expect(buildReceiptDocument(source({ payment: p }), 'vendor').notes).not.toContain('You sent ₦1,000 more than needed.');
  });
});
