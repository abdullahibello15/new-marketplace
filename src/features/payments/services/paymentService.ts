import { addMinutes } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { findBank } from '../../../data/nigerianBanks';
import { formatNaira } from '../../../utils/format';
import { JOB_ROUTES, JOB_STATUS } from '../../jobs/constants';
import { getJob } from '../../jobs/services/jobService';
import { FULFILMENT_METHOD, ORDER_ROUTES, ORDER_STATUS } from '../../orders/constants';
import { getOrder } from '../../orders/services/orderService';
import { DASHBOARD_ROUTES, INVOICE_KIND_LABELS } from '../../vendor-dashboard/constants';
import { planById } from '../../vendor-dashboard/plans';
import { getInvoice, markInvoicePaid } from '../../vendor-dashboard/services/subscriptionService';
import type { Invoice } from '../../vendor-dashboard/types';
import { GWANI_PAYEE, MOCK_PSP, PAYMENT_CONFIG } from '../config';
import { ESCROW_EVENT, ESCROW_STATUS, FINAL_PAYMENT_STATUSES, PAYMENT_METHOD, PAYMENT_METHOD_ORDER, PAYMENT_STATUS, PAYMENT_SUBJECT } from '../constants';
import { mockPayments } from '../mock/payments';
import { escrowForPayment, holdFunds } from './escrowService';
import { createTransaction, hostedCheckoutUrl, issueUssdCode, issueVirtualAccount, queryTransaction } from './mockPsp';
import type { Job } from '../../jobs/types';
import type { Order } from '../../orders/types';
import type {
  Payable,
  Payment,
  PaymentInitiation,
  PaymentMethodChoice,
  PaymentOverview,
  PaymentSubjectRef,
  Receipt } from
'../types';

/*
 * The payment API the app talks to (our backend, mocked). It owns amounts and statuses: the browser
 * only ever sends which job or order and which method, and success is only ever reported after asking
 * the payment provider (mockPsp) about the reference. Card details never pass through here.
 */
let payments: Payment[] = structuredClone(mockPayments);

const CASH_LIMIT_MULTIPLIER = 10;

const sameSubject = (a: PaymentSubjectRef, b: PaymentSubjectRef) => a.kind === b.kind && a.id === b.id;
const isFinal = (p: Payment) => FINAL_PAYMENT_STATUSES.includes(p.status);

function newReference(): string {
  const random = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `GW-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function save(updated: Payment): Payment {
  payments = payments.some((p) => p.reference === updated.reference) ?
  payments.map((p) => p.reference === updated.reference ? updated : p) :
  [updated, ...payments];
  return updated;
}

/* ---------- What's being paid for ---------- */

const JOB_ENDED: Partial<Record<Job['status'], string>> = {
  declined: 'The vendor declined this job.',
  quote_rejected: 'You turned down the quote.',
  cancelled: 'This job was cancelled.'
};
const JOB_ON_HOLD = 'Payment is on hold while Gwani reviews the problem you reported.';
const JOB_CASH_CONFIRMABLE: Job['status'][] = [JOB_STATUS.AwaitingConfirmation, JOB_STATUS.Completed, JOB_STATUS.Closed];
const ORDER_ENDED: Partial<Record<Order['status'], string>> = {
  declined: 'The vendor declined this order.',
  cancelled: 'This order was cancelled.',
  out_of_stock: 'This order ended because nothing was in stock.'
};
const ORDER_CASH_CONFIRMABLE: Order['status'][] = [ORDER_STATUS.Collected, ORDER_STATUS.Completed];
const JOB_FULFILLED: Job['status'][] = [JOB_STATUS.Completed, JOB_STATUS.Closed];

function acceptsCash(vendorId: string): boolean {
  return getAllVendors().find((v) => v.id === vendorId)?.acceptsCash !== false;
}

function jobPayable(job: Job): Payable {
  const cashOk = acceptsCash(job.vendorId);
  return {
    subject: { kind: PAYMENT_SUBJECT.Job, id: job.id },
    title: `Job #${job.id}${job.serviceName ? ` · ${job.serviceName}` : ''}`,
    vendorId: job.vendorId,
    vendorName: job.vendorName,
    customerId: job.customerId,
    customerName: job.customerName,
    lines: job.agreedPrice ? [{ label: `${job.serviceName ?? 'Job'} (agreed price)`, amount: job.agreedPrice }] : [],
    total: job.agreedPrice ?? 0,
    blockedReason:
    JOB_ENDED[job.status] ?? (
    job.status === JOB_STATUS.Disputed ? JOB_ON_HOLD : job.agreedPrice === null ? 'You can pay once you’ve accepted a quote.' : null),
    methods: PAYMENT_METHOD_ORDER.filter((m) => m !== PAYMENT_METHOD.Cash || cashOk),
    cashUnavailableReason: cashOk ? null : `${job.vendorName} doesn’t accept cash.`,
    cashConfirmable: JOB_CASH_CONFIRMABLE.includes(job.status),
    fulfilled: JOB_FULFILLED.includes(job.status),
    returnPath: JOB_ROUTES.job(job.id)
  };
}

function orderPayable(order: Order): Payable {
  const pickup = order.method === FULFILMENT_METHOD.Pickup;
  const cashOk = pickup && acceptsCash(order.vendorId);
  const lines = order.items.filter((i) => !i.outOfStock).map((i) => ({ label: `${i.quantity} × ${i.name}`, amount: i.unitPrice * i.quantity }));
  return {
    subject: { kind: PAYMENT_SUBJECT.Order, id: order.id },
    title: `Order #${order.id}`,
    vendorId: order.vendorId,
    vendorName: order.vendorName,
    customerId: order.customerId,
    customerName: order.customerName,
    lines: order.deliveryFee ? [...lines, { label: 'Delivery', amount: order.deliveryFee }] : lines,
    total: order.total,
    blockedReason: ORDER_ENDED[order.status] ?? null,
    methods: PAYMENT_METHOD_ORDER.filter((m) => m !== PAYMENT_METHOD.Cash || cashOk),
    cashUnavailableReason: cashOk ? null : pickup ? `${order.vendorName} doesn’t accept cash.` : 'Cash is only for pickup orders.',
    cashConfirmable: ORDER_CASH_CONFIRMABLE.includes(order.status),
    fulfilled: order.status === ORDER_STATUS.Completed,
    returnPath: ORDER_ROUTES.order(order.id)
  };
}

const INVOICE_BLOCKED: Partial<Record<Invoice['status'], string>> = {
  paid: 'This invoice is already paid.',
  void: 'This invoice was replaced by a newer one. Start again from your subscription page.'
};

/** A vendor's subscription invoice: paid to Gwani, online methods only, never escrowed. */
function invoicePayable(invoice: Invoice): Payable {
  const plan = planById(invoice.planId);
  const vendor = getAllVendors().find((v) => v.id === invoice.vendorId);
  return {
    subject: { kind: PAYMENT_SUBJECT.Subscription, id: invoice.id },
    title: `${plan.name} plan · ${INVOICE_KIND_LABELS[invoice.kind]}`,
    vendorId: GWANI_PAYEE.id,
    vendorName: GWANI_PAYEE.name,
    customerId: invoice.vendorId,
    customerName: vendor?.name ?? invoice.vendorId,
    lines: invoice.lines,
    total: invoice.amount,
    blockedReason: INVOICE_BLOCKED[invoice.status] ?? null,
    methods: PAYMENT_METHOD_ORDER.filter((m) => m !== PAYMENT_METHOD.Cash),
    cashUnavailableReason: 'Subscriptions are paid online.',
    cashConfirmable: false,
    fulfilled: false,
    returnPath: DASHBOARD_ROUTES.subscription
  };
}

async function loadPayable(subject: PaymentSubjectRef): Promise<Payable> {
  if (subject.kind === PAYMENT_SUBJECT.Subscription) return invoicePayable(await getInvoice(subject.id));
  return subject.kind === PAYMENT_SUBJECT.Job ? jobPayable(await getJob(subject.id)) : orderPayable(await getOrder(subject.id));
}

/**
 * A verified payment lands: subscription invoices take effect; job and order payments go into escrow
 * (released at once if the work is already confirmed). Both are idempotent.
 */
function settlePaid(p: Payment, payable: Payable, at: string): void {
  if (p.subject.kind === PAYMENT_SUBJECT.Subscription) markInvoicePaid(p.subject.id, { reference: p.reference, method: p.method, paidAt: p.paidAt ?? at });else
  holdFunds(p, payable.fulfilled, at);
}

/* ---------- Reconciling with the provider ---------- */

/**
 * Brings a payment up to date: asks the PSP about online payments and applies expiry. A newly verified
 * online payment is put into escrow (held until the work is done). Refunds come from escrow: once escrow
 * has returned everything, the payment shows as Refunded. Never trusts what the browser said.
 */
function reconcile(p: Payment, payable: Payable, now = new Date()): Payment {
  const at = now.toISOString();
  if (p.status === PAYMENT_STATUS.Paid) {
    const escrow = escrowForPayment(p.reference);
    if (escrow?.status === ESCROW_STATUS.Refunded) {
      const note = [...escrow.ledger].reverse().find((e) => e.type === ESCROW_EVENT.Refunded)?.note ?? 'Refunded';
      return save({ ...p, status: PAYMENT_STATUS.Refunded, updatedAt: at, outcome: `${note}. ${formatNaira(p.amount)} returned to you (mock).` });
    }
    // Paid before escrow existed for it (e.g. seeded data): settle it now.
    if (!escrow) settlePaid(p, payable, at);
    return p;
  }
  if (isFinal(p) || p.method === PAYMENT_METHOD.Cash) return p;

  const psp = queryTransaction(p.reference, now.getTime());
  const expired = p.expiresAt !== null && new Date(p.expiresAt) <= now;
  if (psp?.state === 'success') {
    const extra = psp.amountReceived - p.amount;
    const paid = save({
      ...p,
      status: PAYMENT_STATUS.Paid,
      paidAt: at,
      updatedAt: at,
      amountReceived: psp.amountReceived,
      outcome: extra > 0 ? `You sent ${formatNaira(extra)} more than needed. The extra will be refunded to your account within 24 hours (mock).` : null
    });
    settlePaid(paid, payable, at);
    return paid;
  }
  if (psp?.state === 'failed') return save({ ...p, status: PAYMENT_STATUS.Failed, updatedAt: at, outcome: psp.failureReason });

  const received = psp?.amountReceived ?? 0;
  if (expired && !psp?.settling) {
    return save({
      ...p,
      status: PAYMENT_STATUS.Expired,
      updatedAt: at,
      amountReceived: received,
      outcome: received > 0 ?
      `Only ${formatNaira(received)} of ${formatNaira(p.amount)} arrived before this expired. It will be refunded within 24 hours (mock). Start a new payment to try again.` :
      'This payment expired before any money arrived. Start a new one to try again.'
    });
  }
  const short = received > 0 && received < p.amount ? p.amount - received : 0;
  return save({
    ...p,
    status: psp?.settling ? PAYMENT_STATUS.Processing : PAYMENT_STATUS.Pending,
    amountReceived: received,
    outcome: short ? `We received ${formatNaira(received)}, which is ${formatNaira(short)} short. Send ${formatNaira(short)} more to the same account before it expires.` : null
  });
}

function findPayment(reference: string): Payment {
  const p = payments.find((x) => x.reference === reference);
  if (!p) throw new ApiError('We couldn’t find that payment.', 404);
  return p;
}

const latestFor = (subject: PaymentSubjectRef) =>
payments.filter((p) => sameSubject(p.subject, subject)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ---------- The API ---------- */

/** GET /payables/:kind/:id/payment — what's owed, which methods apply, and the latest payment (brought up to date). */
export async function getPaymentOverview(subject: PaymentSubjectRef): Promise<PaymentOverview> {
  const payable = await loadPayable(subject);
  return mockResponse(() => {
    const all = latestFor(subject).map((p) => reconcile(p, payable));
    // A paid (or refunded) payment wins over a later abandoned attempt.
    const payment = all.find((p) => p.status === PAYMENT_STATUS.Paid || p.status === PAYMENT_STATUS.Refunded) ?? all[0] ?? null;
    return { payable, payment, escrow: payment ? escrowForPayment(payment.reference) : null };
  }, 200);
}

/**
 * POST /payments — starts paying for a job or order. The amount comes from the job or order, never
 * the browser. Re-sending the same method returns the open payment instead of creating a second one
 * (double-submit safe); choosing a different method replaces the open one.
 */
export async function initiatePayment(order: PaymentSubjectRef, choice: PaymentMethodChoice): Promise<PaymentInitiation> {
  const payable = await loadPayable(order);
  return mockResponse(() => {
    if (payable.blockedReason) throw new ApiError(payable.blockedReason, 409);
    if (!payable.methods.includes(choice.method)) throw new ApiError(payable.cashUnavailableReason ?? 'That payment method isn’t available here.', 400);
    const bank = choice.method === PAYMENT_METHOD.Ussd ? findBank(choice.bankId) : undefined;
    if (choice.method === PAYMENT_METHOD.Ussd && !bank) throw new ApiError('Choose your bank.', 400);

    const now = new Date();
    const existing = latestFor(order).map((p) => reconcile(p, payable, now));
    if (existing.some((p) => p.status === PAYMENT_STATUS.Paid)) throw new ApiError('This has already been paid.', 409);

    const open = existing.filter((p) => !isFinal(p));
    const reusable = open.find((p) => p.method === choice.method && p.amount === payable.total && (!bank || p.ussd?.bankId === bank.id));
    if (reusable) return { payment: reusable, authorizationUrl: reusable.method === PAYMENT_METHOD.Card ? hostedCheckoutUrl(reusable.reference) : null };
    // Abandoned attempts are closed so only one payment is ever open. A part-paid transfer must be finished first.
    for (const p of open) {
      if (p.amountReceived > 0) throw new ApiError('Part of a transfer has already arrived. Finish that payment or wait for it to expire.', 409);
      if (p.cash && (p.cash.vendorAmount !== null || p.cash.customerAmount !== null)) {
        throw new ApiError('Cash has already been confirmed for this, so the payment method can’t change.', 409);
      }
      save({ ...p, status: PAYMENT_STATUS.Expired, updatedAt: now.toISOString(), outcome: 'Replaced by a new payment.' });
    }

    const reference = newReference();
    const minutes =
    choice.method === PAYMENT_METHOD.Transfer ? PAYMENT_CONFIG.transferExpiryMinutes :
    choice.method === PAYMENT_METHOD.Ussd ? PAYMENT_CONFIG.ussdExpiryMinutes :
    choice.method === PAYMENT_METHOD.Card ? PAYMENT_CONFIG.cardSessionMinutes :
    null;
    if (choice.method !== PAYMENT_METHOD.Cash) createTransaction(reference, choice.method, payable.total);
    const payment: Payment = {
      reference,
      subject: order,
      vendorId: payable.vendorId,
      vendorName: payable.vendorName,
      customerId: payable.customerId,
      customerName: payable.customerName,
      description: payable.title,
      amount: payable.total,
      method: choice.method,
      status: PAYMENT_STATUS.Pending,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: minutes ? addMinutes(now, minutes).toISOString() : null,
      paidAt: null,
      amountReceived: 0,
      outcome: null,
      transfer: choice.method === PAYMENT_METHOD.Transfer ? issueVirtualAccount(reference) : null,
      ussd: bank ? { bankId: bank.id, bankName: bank.name, code: issueUssdCode(reference, bank) } : null,
      cash: choice.method === PAYMENT_METHOD.Cash ? { vendorAmount: null, vendorConfirmedAt: null, customerAmount: null, customerConfirmedAt: null } : null,
      reviewFlag: null
    };
    save(payment);
    return { payment, authorizationUrl: choice.method === PAYMENT_METHOD.Card ? hostedCheckoutUrl(reference) : null };
  }, MOCK_PSP.latencyMs);
}

/**
 * POST /payments/:reference/verify — after the customer returns from the hosted page. Asks the
 * provider what really happened. The only thing that can turn a card payment into Paid.
 */
export async function verifyPayment(reference: string): Promise<Payment> {
  const current = findPayment(reference);
  const payable = await loadPayable(current.subject);
  return mockResponse(() => reconcile(findPayment(reference), payable), MOCK_PSP.latencyMs);
}

/** GET /payments/:reference — current status, for polling while a transfer or USSD payment comes in. */
export async function getPaymentStatus(reference: string): Promise<Payment> {
  const payable = await loadPayable(findPayment(reference).subject);
  return mockResponse(() => reconcile(findPayment(reference), payable), 300);
}

/* ---------- Cash on completion ---------- */

function settleCash(p: Payment, at: string): Payment {
  const c = p.cash;
  if (!c || c.vendorAmount === null || c.customerAmount === null) return { ...p, status: PAYMENT_STATUS.Processing, updatedAt: at };
  if (c.vendorAmount === c.customerAmount) {
    return { ...p, status: PAYMENT_STATUS.Paid, paidAt: at, updatedAt: at, amountReceived: c.vendorAmount, reviewFlag: null, outcome: null };
  }
  return {
    ...p,
    status: PAYMENT_STATUS.Processing,
    updatedAt: at,
    reviewFlag: `The amounts don’t match: ${p.vendorName} says ${formatNaira(c.vendorAmount)} was received, the customer says ${formatNaira(c.customerAmount)} was paid. Gwani’s team will review it and contact you both.`
  };
}

async function confirmCash(reference: string, party: 'vendor' | 'customer', amount: number): Promise<Payment> {
  const current = findPayment(reference);
  const payable = await loadPayable(current.subject);
  return mockResponse(() => {
    const p = findPayment(reference);
    if (p.method !== PAYMENT_METHOD.Cash || !p.cash) throw new ApiError('This isn’t a cash payment.', 400);
    if (p.status === PAYMENT_STATUS.Paid) throw new ApiError('This cash payment is already confirmed.', 409);
    if (!payable.cashConfirmable) throw new ApiError('Cash can be confirmed once the work is marked done.', 409);
    if (!Number.isInteger(amount) || amount <= 0 || amount > p.amount * CASH_LIMIT_MULTIPLIER) throw new ApiError('Enter the amount in whole Naira.', 400);
    const at = new Date().toISOString();
    const cash = party === 'vendor' ? { ...p.cash, vendorAmount: amount, vendorConfirmedAt: at } : { ...p.cash, customerAmount: amount, customerConfirmedAt: at };
    return save(settleCash({ ...p, cash }, at));
  }, MOCK_PSP.latencyMs);
}

/** POST /payments/:reference/cash/vendor — "Cash received (₦amount)". */
export const confirmCashReceived = (reference: string, amount: number) => confirmCash(reference, 'vendor', amount);

/** POST /payments/:reference/cash/customer — "I paid ₦amount". */
export const confirmCashPaid = (reference: string, amount: number) => confirmCash(reference, 'customer', amount);

/* ---------- Receipts ---------- */

/** GET /payments/:reference/receipt — only for money that actually moved. */
export async function getReceipt(reference: string): Promise<Receipt> {
  const current = findPayment(reference);
  const payable = await loadPayable(current.subject);
  return mockResponse(() => {
    const p = reconcile(findPayment(reference), payable);
    if (p.status !== PAYMENT_STATUS.Paid && p.status !== PAYMENT_STATUS.Refunded) throw new ApiError('There’s no receipt until the payment goes through.', 409);
    return { payment: p, lines: payable.lines, issuedAt: p.paidAt ?? p.updatedAt };
  }, 300);
}
