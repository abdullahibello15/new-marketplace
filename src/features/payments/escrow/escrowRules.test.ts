import { describe, expect, it } from 'vitest';
import { JOB_STATUS } from '../../jobs/constants';
import { ORDER_STATUS } from '../../orders/constants';
import { ESCROW_EVENT, ESCROW_STATUS, PAYMENT_METHOD, PAYMENT_SUBJECT } from '../constants';
import { ESCROW_CONFIG } from './escrowConfig';
import {
  applyEscrowDecision,
  autoReleaseAt,
  commissionFor,
  earningsBuckets,
  escrowTotals,
  holdDecision,
  jobEscrowDecision,
  openEscrow,
  orderEscrowDecision,
  payOutEscrow } from
'./escrowRules';
import type { JobEscrowChange } from './escrowRules';

const T0 = '2026-10-01T10:00:00.000Z';
const T1 = '2026-10-02T10:00:00.000Z';
const T2 = '2026-10-03T10:00:00.000Z';

const held = (amount = 10_000, kind: 'job' | 'order' = PAYMENT_SUBJECT.Job) =>
openEscrow(
  {
    reference: 'GW-TEST',
    subject: { kind, id: '1' },
    vendorId: 'v1',
    vendorName: 'Vendor',
    customerName: 'Customer',
    description: 'Test',
    method: PAYMENT_METHOD.Card,
    amount
  },
  T0
);

const jobChange = (from: JobEscrowChange['from'], to: JobEscrowChange['to'], extra: Partial<JobEscrowChange> = {}): JobEscrowChange => ({
  from,
  to,
  cancellationFee: 0,
  disputeRefund: null,
  ...extra
});

describe('commission', () => {
  it('uses the configured rate and rounds to whole Naira', () => {
    expect(commissionFor(10_000)).toBe(Math.round(10_000 * ESCROW_CONFIG.commissionRate));
    expect(commissionFor(8_333, 0.05)).toBe(417);
    expect(commissionFor(0)).toBe(0);
  });
});

describe('holding', () => {
  it('opens Held with the whole amount and one ledger entry', () => {
    const e = held();
    expect(e.status).toBe(ESCROW_STATUS.Held);
    expect(escrowTotals(e)).toEqual({ held: 10_000, released: 0, refunded: 0, commission: 0, vendorNet: 0 });
    expect(e.ledger.map((l) => l.type)).toEqual([ESCROW_EVENT.Held]);
  });

  it('releases at once when paid after the work was already confirmed', () => {
    const e = applyEscrowDecision(held(), holdDecision(true), T1);
    expect(e.status).toBe(ESCROW_STATUS.Released);
    expect(holdDecision(false)).toEqual({ kind: 'none' });
  });
});

describe('job release rules', () => {
  it('releases when the customer confirms completion, taking commission once', () => {
    const e = applyEscrowDecision(held(), jobEscrowDecision(jobChange(JOB_STATUS.AwaitingConfirmation, JOB_STATUS.Completed), 10_000), T1);
    const t = escrowTotals(e);
    expect(e.status).toBe(ESCROW_STATUS.Released);
    expect(t.released).toBe(10_000);
    expect(t.commission).toBe(commissionFor(10_000));
    expect(t.vendorNet).toBe(10_000 - commissionFor(10_000));
  });

  it('auto-release follows the job auto-confirm window (48 hours)', () => {
    expect(ESCROW_CONFIG.jobAutoReleaseHours).toBe(48);
    expect(autoReleaseAt(PAYMENT_SUBJECT.Job, new Date(T0)).toISOString()).toBe('2026-10-03T10:00:00.000Z');
  });

  it('does nothing for steps that don’t move money', () => {
    expect(jobEscrowDecision(jobChange(JOB_STATUS.Scheduled, JOB_STATUS.InProgress), 10_000)).toEqual({ kind: 'none' });
    expect(jobEscrowDecision(jobChange(JOB_STATUS.InProgress, JOB_STATUS.AwaitingConfirmation), 10_000)).toEqual({ kind: 'none' });
    expect(jobEscrowDecision(jobChange(JOB_STATUS.Completed, JOB_STATUS.Closed), 0)).toEqual({ kind: 'none' });
  });
});

describe('job refund rules', () => {
  it('refunds in full when cancelled before the job starts with no fee', () => {
    const e = applyEscrowDecision(held(), jobEscrowDecision(jobChange(JOB_STATUS.Scheduled, JOB_STATUS.Cancelled), 10_000), T1);
    expect(e.status).toBe(ESCROW_STATUS.Refunded);
    expect(escrowTotals(e)).toMatchObject({ held: 0, refunded: 10_000, released: 0, commission: 0 });
  });

  it('deducts the cancellation fee: the customer gets the rest, the vendor gets the fee less commission', () => {
    const decision = jobEscrowDecision(jobChange(JOB_STATUS.Scheduled, JOB_STATUS.Cancelled, { cancellationFee: 2_000 }), 10_000);
    const e = applyEscrowDecision(held(), decision, T1);
    const t = escrowTotals(e);
    expect(e.status).toBe(ESCROW_STATUS.PartiallyRefunded);
    expect(t.refunded).toBe(8_000);
    expect(t.released).toBe(2_000);
    expect(t.vendorNet).toBe(2_000 - commissionFor(2_000));
  });

  it('never keeps a fee larger than what is held', () => {
    const e = applyEscrowDecision(held(1_000), jobEscrowDecision(jobChange(JOB_STATUS.Scheduled, JOB_STATUS.Cancelled, { cancellationFee: 5_000 }), 1_000), T1);
    expect(escrowTotals(e)).toMatchObject({ refunded: 0, released: 1_000, held: 0 });
  });
});

describe('disputes', () => {
  const disputed = () => applyEscrowDecision(held(), jobEscrowDecision(jobChange(JOB_STATUS.AwaitingConfirmation, JOB_STATUS.Disputed), 10_000), T1);

  it('keeps the money held while disputed', () => {
    const e = disputed();
    expect(e.status).toBe(ESCROW_STATUS.Disputed);
    expect(escrowTotals(e).held).toBe(10_000);
  });

  it('a resolution for the vendor releases everything', () => {
    const e = applyEscrowDecision(disputed(), jobEscrowDecision(jobChange(JOB_STATUS.Disputed, JOB_STATUS.Completed), 10_000), T2);
    expect(e.status).toBe(ESCROW_STATUS.Released);
  });

  it('a resolution for the customer refunds everything, with no commission', () => {
    const e = applyEscrowDecision(disputed(), jobEscrowDecision(jobChange(JOB_STATUS.Disputed, JOB_STATUS.Cancelled, { cancellationFee: 3_000 }), 10_000), T2);
    expect(e.status).toBe(ESCROW_STATUS.Refunded);
    expect(escrowTotals(e).commission).toBe(0);
  });

  it('a split refunds part and releases the rest', () => {
    const e = applyEscrowDecision(disputed(), jobEscrowDecision(jobChange(JOB_STATUS.Disputed, JOB_STATUS.Completed, { disputeRefund: 4_000 }), 10_000), T2);
    expect(e.status).toBe(ESCROW_STATUS.PartiallyRefunded);
    expect(escrowTotals(e)).toMatchObject({ refunded: 4_000, released: 6_000, held: 0 });
  });
});

describe('order rules', () => {
  it('releases when the customer confirms receipt or pickup', () => {
    const e = applyEscrowDecision(held(20_000, PAYMENT_SUBJECT.Order), orderEscrowDecision({ from: ORDER_STATUS.Collected, to: ORDER_STATUS.Completed, orderTotal: 20_000 }, 20_000), T1);
    expect(e.status).toBe(ESCROW_STATUS.Released);
  });

  it('auto-release is 72 hours after Delivered/Collected', () => {
    expect(ESCROW_CONFIG.orderAutoReleaseHours).toBe(72);
    expect(autoReleaseAt(PAYMENT_SUBJECT.Order, new Date(T0)).toISOString()).toBe('2026-10-04T10:00:00.000Z');
  });

  it.each([ORDER_STATUS.Cancelled, ORDER_STATUS.Declined, ORDER_STATUS.OutOfStock])('refunds in full when the order ends as %s', (to) => {
    const e = applyEscrowDecision(held(20_000, PAYMENT_SUBJECT.Order), orderEscrowDecision({ from: ORDER_STATUS.Placed, to, orderTotal: 20_000 }, 20_000), T1);
    expect(e.status).toBe(ESCROW_STATUS.Refunded);
  });

  it('refunds dropped out-of-stock items at once and keeps the rest held, then releases it', () => {
    const partly = applyEscrowDecision(held(20_000, PAYMENT_SUBJECT.Order), orderEscrowDecision({ from: ORDER_STATUS.Placed, to: ORDER_STATUS.Confirmed, orderTotal: 12_000 }, 20_000), T1);
    expect(partly.status).toBe(ESCROW_STATUS.Held);
    expect(escrowTotals(partly)).toMatchObject({ held: 12_000, refunded: 8_000 });
    const done = applyEscrowDecision(partly, orderEscrowDecision({ from: ORDER_STATUS.Delivered, to: ORDER_STATUS.Completed, orderTotal: 12_000 }, 12_000), T2);
    expect(done.status).toBe(ESCROW_STATUS.PartiallyRefunded);
    expect(escrowTotals(done)).toMatchObject({ released: 12_000, refunded: 8_000, held: 0, commission: commissionFor(12_000) });
  });
});

describe('safety', () => {
  it('never refunds or releases more than is held, and does nothing once settled', () => {
    const refunded = applyEscrowDecision(held(), { kind: 'refund', amount: 50_000, note: 'x' }, T1);
    expect(escrowTotals(refunded).refunded).toBe(10_000);
    const again = applyEscrowDecision(refunded, { kind: 'release', note: 'x' }, T2);
    expect(again).toBe(refunded);
  });
});

describe('vendor earnings', () => {
  it('splits into pending (held), available (released) and paid out, net of commission', () => {
    const pending = held(10_000);
    const available = applyEscrowDecision(held(20_000), { kind: 'release', note: 'x' }, T1);
    const paid = payOutEscrow(applyEscrowDecision(held(5_000), { kind: 'release', note: 'x' }, T1), T2);
    const refunded = applyEscrowDecision(held(7_000), { kind: 'refund', amount: 7_000, note: 'x' }, T1);
    expect(earningsBuckets([pending, available, paid, refunded])).toEqual({
      pending: 10_000 - commissionFor(10_000),
      available: 20_000 - commissionFor(20_000),
      paidOut: 5_000 - commissionFor(5_000)
    });
    expect(paid.ledger[paid.ledger.length - 1]).toMatchObject({ type: ESCROW_EVENT.PaidOut, amount: 5_000 - commissionFor(5_000) });
  });

  it('paying out twice changes nothing the second time', () => {
    const once = payOutEscrow(applyEscrowDecision(held(), { kind: 'release', note: 'x' }, T1), T2);
    expect(payOutEscrow(once, T2)).toBe(once);
  });
});
