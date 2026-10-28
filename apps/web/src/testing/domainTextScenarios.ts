/*
 * Every piece of user-facing text the domain rules produce, for a fixed set of inputs: returned messages
 * (transition refusals, cancellation terms, days left, receipts) and stored ones (escrow ledger notes,
 * invoice line labels, including the seed data). Test support only.
 *
 * `render` turns whatever the domain returned into the text a screen shows. The scenarios never change;
 * only `render` does. That is what lets domainText.test.ts compare today's text with the snapshot taken
 * from main before the domain started returning message keys (fixtures/domain-text.before.json).
 *
 * Callers must fake Date before this module loads (the seed data is relative to "now"): see FIXED_NOW.
 */
import { addDays, addMinutes, subHours } from 'date-fns';
import { JOB_ACTOR, JOB_STATUS, START_JOB_EARLY_MINUTES } from '../features/jobs/constants';
import { cancellationPolicyLines, getCancellationTerms } from '../features/jobs/cancellationPolicy';
import { mockJobs } from '../features/jobs/mock/jobs';
import { applyTransition, transitionBlockedReason } from '../features/jobs/stateMachine';
import { ORDER_STATUS } from '../features/orders/constants';
import { mockOrders } from '../features/orders/mock/orders';
import { applyOrderTransition, orderTransitionBlockedReason } from '../features/orders/stateMachine';
import { holdDecision, jobEscrowDecision, orderEscrowDecision } from '../features/payments/escrow/escrowRules';
import { mockEscrows } from '../features/payments/mock/escrows';
import { mockPayments } from '../features/payments/mock/payments';
import { buildReceiptDocument, hasReceipt } from '../features/payments/utils/receiptData';
import type { Payment, ReceiptDocument, ReceiptSource, ReceiptViewer } from '../features/payments/types';
import { PLAN_ID } from '../features/vendor-dashboard/constants';
import { mockAssociations } from '../features/vendor-dashboard/mock/associations';
import { mockDirectorySubscriptions, mockHistoryInvoices, mockInvoices, mockSubscription } from '../features/vendor-dashboard/mock/subscription';
import { quoteChange } from '../features/vendor-dashboard/utils/billing';
import { quoteBundle, quoteMemberAdditions } from '../features/vendor-dashboard/utils/bundle';
import { describeDaysLeft } from '../features/vendor-dashboard/utils/subscription';

/** The clock for every scenario (and for the seed data, which is built relative to it). */
export const FIXED_NOW = '2026-10-15T09:30:00.000Z';

export type Render = (value: unknown) => string;
export type DomainText = Record<string, string>;

const JOB_ACTORS = Object.values(JOB_ACTOR);
const JOB_STATUSES = Object.values(JOB_STATUS);
const ORDER_STATUSES = Object.values(ORDER_STATUS);
const PLANS = Object.values(PLAN_ID);

/** Instants around midnight in Lagos (UTC+1) and in UTC, for the one date inside a message. */
export const NEAR_MIDNIGHT = ['2026-10-28T22:59:00.000Z', '2026-10-28T23:01:00.000Z', '2026-10-28T23:59:00.000Z', '2026-10-29T00:01:00.000Z'];

export function collectReturned(render: Render): DomainText {
  const now = new Date(FIXED_NOW);
  const out: DomainText = {};
  const put = (id: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== '') out[id] = render(value);
  };

  for (const job of mockJobs) {
    for (const to of JOB_STATUSES) {
      for (const by of JOB_ACTORS) {
        put(`job:${job.id}:${job.status}>${to}:${by}`, transitionBlockedReason(job, to, by, now));
        if (to === JOB_STATUS.Cancelled) put(`job:${job.id}:${job.status}>${to}:${by}:note`, transitionBlockedReason(job, to, by, now, { note: 'Changed plans' }));
      }
    }
    for (const by of JOB_ACTORS) {
      const times = { now, earlyNotice: job.scheduledAt ? subHours(new Date(job.scheduledAt), 30) : now, late: job.scheduledAt ? subHours(new Date(job.scheduledAt), 2) : now };
      for (const [when, at] of Object.entries(times)) {
        const terms = getCancellationTerms(job, by, at);
        put(`terms:${job.id}:${by}:${when}:warning`, terms.warning);
        put(`terms:${job.id}:${by}:${when}:summary`, terms.summary);
        put(`terms:${job.id}:${by}:${when}:blocked`, terms.blockedReason);
      }
    }
  }

  // Starting a job before its window opens: the only date inside a message.
  const scheduled = mockJobs.find((j) => j.status === JOB_STATUS.Scheduled);
  if (scheduled) {
    for (const iso of NEAR_MIDNIGHT) {
      // The message shows when the start window opens (START_JOB_EARLY_MINUTES before the booking): `iso`.
      const job = { ...scheduled, scheduledAt: addMinutes(new Date(iso), START_JOB_EARLY_MINUTES).toISOString() };
      put(`job:startFrom:${iso}`, transitionBlockedReason(job, JOB_STATUS.InProgress, JOB_ACTOR.Vendor, subHours(new Date(iso), 2)));
    }
    try {
      applyTransition(scheduled, JOB_STATUS.Closed, JOB_ACTOR.Customer, { at: now });
    } catch (error) {
      put('job:applyTransition:error', error);
    }
  }

  cancellationPolicyLines().forEach((line, i) => put(`policy:line${i + 1}`, line));

  for (const order of mockOrders) {
    for (const to of ORDER_STATUSES) {
      for (const by of JOB_ACTORS) {
        put(`order:${order.id}:${order.status}>${to}:${by}`, orderTransitionBlockedReason(order, to, by as never, now));
      }
    }
  }
  const order = mockOrders[0];
  try {
    applyOrderTransition(order, ORDER_STATUS.Completed, JOB_ACTOR.Customer as never, { at: now } as never);
  } catch (error) {
    put('order:applyTransition:error', error);
  }

  for (const days of [-30, -3, -1, 0, 1, 2, 5, 30]) put(`daysLeft:${days}`, describeDaysLeft(days));

  const vendor: ReceiptSource['vendor'] = { name: 'Bala Plumbing Services', trade: 'Plumbing', location: 'Minna' };
  const receipt = (id: string, doc: ReceiptDocument) => {
    put(`${id}:title`, doc.title);
    put(`${id}:method`, doc.methodLabel);
    doc.notes.forEach((n, i) => put(`${id}:note${i}`, n));
    doc.breakdown.items.forEach((l, i) => put(`${id}:item${i}`, l.label));
    doc.breakdown.fees.forEach((l, i) => put(`${id}:fee${i}`, l.label));
    doc.breakdown.refunds.forEach((l, i) => put(`${id}:refund${i}`, l.label));
  };
  const source = (payment: Payment, over: Partial<ReceiptSource> = {}): ReceiptSource => ({
    payment,
    escrow: mockEscrows.find((e) => e.paymentReference === payment.reference) ?? null,
    items: [],
    deliveryFee: 0,
    cancellationFee: 0,
    vendor,
    ...over
  });
  const viewers: ReceiptViewer[] = ['customer', 'vendor'];
  for (const payment of mockPayments.filter(hasReceipt)) {
    for (const viewer of viewers) {
      receipt(`receipt:${payment.reference}:${viewer}`, buildReceiptDocument(source(payment, { cancellationFee: 1600 }), viewer));
    }
  }
  const sample = mockPayments.find(hasReceipt);
  if (sample) {
    const items = [{ label: 'Kitchen tap', amount: sample.amount - 1000 }];
    receipt('receipt:otherCharges', buildReceiptDocument(source(sample, { items }), 'customer'));
    receipt('receipt:adjustment', buildReceiptDocument(source(sample, { items: [{ label: 'Kitchen tap', amount: sample.amount + 500 }] }), 'customer'));
    for (const [id, over] of Object.entries({
      transfer: { transfer: { bankName: 'GTBank' } },
      ussd: { ussd: { bankName: 'Access Bank' } },
      cash: { cash: { receivedBy: 'Bala' } }
    })) {
      receipt(`receipt:method:${id}`, buildReceiptDocument(source({ ...sample, ...over } as Payment), 'customer'));
    }
  }
  return out;
}

export function collectStored(render: Render): DomainText {
  const now = new Date(FIXED_NOW);
  const out: DomainText = {};
  const put = (id: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== '') out[id] = render(value);
  };
  const note = (decision: object) => ('note' in decision ? decision.note : null);

  // Escrow ledger notes: every decision the rules can make, then the seed ledger.
  for (const from of JOB_STATUSES) {
    for (const to of JOB_STATUSES) {
      for (const cancellationFee of [0, 1600, 1250]) {
        for (const disputeRefund of [null, 0, 3000]) {
          put(`escrow:job:${from}>${to}:fee${cancellationFee}:refund${disputeRefund}`, note(jobEscrowDecision({ from, to, cancellationFee, disputeRefund }, 8000)));
        }
      }
    }
  }
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      for (const orderTotal of [0, 5000, 20000]) {
        for (const disputeRefund of [null, 3000]) {
          put(`escrow:order:${from}>${to}:total${orderTotal}:refund${disputeRefund}`, note(orderEscrowDecision({ from, to, orderTotal, disputeRefund }, 17000)));
        }
      }
    }
  }
  put('escrow:hold:fulfilled', note(holdDecision(true)));
  for (const escrow of mockEscrows) escrow.ledger.forEach((entry, i) => put(`seed:escrow:${escrow.paymentReference}:${i}`, entry.note));

  // Invoice line labels: every quote the rules can make, then the seed invoices.
  const subscriptions = [mockSubscription, ...mockDirectorySubscriptions.slice(0, 6)];
  for (const sub of subscriptions) {
    for (const target of PLANS) {
      for (const [when, at] of Object.entries({ now, grace: addDays(new Date(sub.renewsOn), 3), early: subHours(new Date(sub.renewsOn), 24 * 20) })) {
        quoteChange(sub, target, at).lines.forEach((l, i) => put(`quote:${sub.vendorId}:${sub.planId}>${target}:${when}:${i}`, l.label));
      }
    }
  }
  const names = ['Aisha Bello', 'Musa Danjuma', 'Ngozi Okafor', 'Tunde Adeyemi', 'Hauwa Sani', 'Chidi Eze', 'Zainab Umar', 'Ibrahim Lawal', 'Fatima Garba', 'Emeka Obi', 'Halima Yusuf', 'Bola Ade'];
  for (let n = 1; n <= names.length; n++) {
    quoteBundle(names.slice(0, n), 4000, 'Standard').lines.forEach((l, i) => put(`bundle:${n}:${i}`, l.label));
    quoteMemberAdditions(names.slice(0, 2), n + 2, 4000, '2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z', now).lines.forEach((l, i) => put(`bundleAdd:${n}:${i}`, l.label));
  }
  for (const invoice of [...mockInvoices, ...mockHistoryInvoices]) invoice.lines.forEach((l, i) => put(`seed:invoice:${invoice.id}:${i}`, l.label));
  put('seed:associations', String(mockAssociations.length));
  return out;
}
