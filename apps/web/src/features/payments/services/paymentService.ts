import { addMinutes } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { requireVerifiedContact } from '../../auth/session';
import { findBank } from '../../../data/nigerianBanks';
import i18n from '../../../i18n';
import { invoiceKindLabel, planName } from '../../../i18n/labels';
import { formatNaira } from '../../../utils/format';
import { JOB_ROUTES, JOB_STATUS } from '../../jobs/constants';
import { getJob } from '../../jobs/services/jobService';
import { FULFILMENT_METHOD, ORDER_ROUTES, ORDER_STATUS } from '../../orders/constants';
import { getOrder } from '../../orders/services/orderService';
import { DASHBOARD_ROUTES, INVOICE_KIND_LABELS } from '../../vendor-dashboard/constants';
import { planById } from '../../vendor-dashboard/plans';
import { findAssociation } from '../../vendor-dashboard/services/associationService';
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
  PaymentSubjectRef } from
'../types';
import { translate } from '../../../i18n/message';

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

/** Why a job can't be paid for now, as translation keys (resolved when the payable is built). */
const JOB_ENDED: Partial<Record<Job['status'], string>> = {
  declined: 'payments:payable.jobDeclined',
  quote_rejected: 'payments:payable.jobQuoteRejected',
  cancelled: 'payments:payable.jobCancelled'
};
const JOB_ON_HOLD = 'payments:payable.jobOnHold';
const JOB_CASH_CONFIRMABLE: Job['status'][] = [JOB_STATUS.AwaitingConfirmation, JOB_STATUS.Completed, JOB_STATUS.Closed];
const ORDER_ENDED: Partial<Record<Order['status'], string>> = {
  declined: 'payments:payable.orderDeclined',
  cancelled: 'payments:payable.orderCancelled',
  out_of_stock: 'payments:payable.orderOutOfStock'
};
/** Resolves one of the reason keys above, or null. */
const reason = (key: string | null | undefined) => key ? i18n.t(key) : null;
const ORDER_CASH_CONFIRMABLE: Order['status'][] = [ORDER_STATUS.Collected, ORDER_STATUS.Completed];
const JOB_FULFILLED: Job['status'][] = [JOB_STATUS.Completed, JOB_STATUS.Closed];

function acceptsCash(vendorId: string): boolean {
  return getAllVendors().find((v) => v.id === vendorId)?.acceptsCash !== false;
}

function jobPayable(job: Job): Payable {
  const cashOk = acceptsCash(job.vendorId);
  return {
    subject: { kind: PAYMENT_SUBJECT.Job, id: job.id },
    title: job.serviceName ? i18n.t('payments:payable.jobTitleService', { id: job.id, service: job.serviceName }) : i18n.t('payments:payable.jobTitle', { id: job.id }),
    vendorId: job.vendorId,
    vendorName: job.vendorName,
    customerId: job.customerId,
    customerName: job.customerName,
    lines: job.agreedPrice ? [{ label: i18n.t('payments:payable.agreedPrice', { service: job.serviceName ?? i18n.t('payments:payable.job') }), amount: job.agreedPrice }] : [],
    total: job.agreedPrice ?? 0,
    blockedReason:
    reason(JOB_ENDED[job.status]) ?? (
    job.status === JOB_STATUS.Disputed ? reason(JOB_ON_HOLD) : job.agreedPrice === null ? i18n.t('payments:payable.acceptQuoteFirst') : null),
    methods: PAYMENT_METHOD_ORDER.filter((m) => m !== PAYMENT_METHOD.Cash || cashOk),
    cashUnavailableReason: cashOk ? null : i18n.t('payments:payable.noCash', { name: job.vendorName }),
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
    title: i18n.t('payments:payable.orderTitle', { id: order.id }),
    vendorId: order.vendorId,
    vendorName: order.vendorName,
    customerId: order.customerId,
    customerName: order.customerName,
    lines: order.deliveryFee ? [...lines, { label: i18n.t('payments:payable.delivery'), amount: order.deliveryFee }] : lines,
    total: order.total,
    blockedReason: reason(ORDER_ENDED[order.status]),
    methods: PAYMENT_METHOD_ORDER.filter((m) => m !== PAYMENT_METHOD.Cash || cashOk),
    cashUnavailableReason: cashOk ? null : pickup ? i18n.t('payments:payable.noCash', { name: order.vendorName }) : i18n.t('payments:payable.cashPickupOnly'),
    cashConfirmable: ORDER_CASH_CONFIRMABLE.includes(order.status),
    fulfilled: order.status === ORDER_STATUS.Completed,
    returnPath: ORDER_ROUTES.order(order.id)
  };
}

const INVOICE_BLOCKED: Partial<Record<Invoice['status'], string>> = {
  paid: 'payments:payable.invoicePaid',
  void: 'payments:payable.invoiceVoid'
};

/** A vendor's subscription invoice: paid to Gwani, online methods only, never escrowed. */
function invoicePayable(invoice: Invoice): Payable {
  const plan = planById(invoice.planId);
  const association = invoice.associationId ? findAssociation(invoice.associationId) : null;
  const vendor = getAllVendors().find((v) => v.id === invoice.vendorId);
  return {
    subject: { kind: PAYMENT_SUBJECT.Subscription, id: invoice.id },
    title: i18n.t('payments:payable.planTitle', { plan: planName(plan.id, plan.name), kind: invoiceKindLabel(invoice.kind, INVOICE_KIND_LABELS[invoice.kind]) }),
    vendorId: GWANI_PAYEE.id,
    vendorName: GWANI_PAYEE.name,
    customerId: invoice.vendorId,
    customerName: association?.name ?? vendor?.name ?? invoice.vendorId,
    lines: invoice.lines,
    total: invoice.amount,
    blockedReason: reason(INVOICE_BLOCKED[invoice.status]),
    methods: PAYMENT_METHOD_ORDER.filter((m) => m !== PAYMENT_METHOD.Cash),
    cashUnavailableReason: i18n.t('payments:payable.subscriptionsOnline'),
    cashConfirmable: false,
    fulfilled: false,
    returnPath: association ? DASHBOARD_ROUTES.association : DASHBOARD_ROUTES.subscription
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
      const stored = [...escrow.ledger].reverse().find((e) => e.type === ESCROW_EVENT.Refunded)?.note;
      const note = stored ? translate(stored) : i18n.t('payments:outcome.refundedFallback');
      return save({ ...p, status: PAYMENT_STATUS.Refunded, updatedAt: at, outcome: i18n.t('payments:outcome.refunded', { note, amount: formatNaira(p.amount) }) });
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
      outcome: extra > 0 ? i18n.t('payments:outcome.extra', { amount: formatNaira(extra) }) : null
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
      i18n.t('payments:outcome.partialExpired', { received: formatNaira(received), amount: formatNaira(p.amount) }) :
      i18n.t('payments:outcome.expired')
    });
  }
  const short = received > 0 && received < p.amount ? p.amount - received : 0;
  return save({
    ...p,
    status: psp?.settling ? PAYMENT_STATUS.Processing : PAYMENT_STATUS.Pending,
    amountReceived: received,
    outcome: short ? i18n.t('payments:outcome.short', { received: formatNaira(received), short: formatNaira(short) }) : null
  });
}

function findPayment(reference: string): Payment {
  const p = payments.find((x) => x.reference === reference);
  if (!p) throw new ApiError(i18n.t('payments:error.notFound'), 404);
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
    requireVerifiedContact();
    if (payable.blockedReason) throw new ApiError(payable.blockedReason, 409);
    if (!payable.methods.includes(choice.method)) throw new ApiError(payable.cashUnavailableReason ?? i18n.t('payments:error.methodUnavailable'), 400);
    const bank = choice.method === PAYMENT_METHOD.Ussd ? findBank(choice.bankId) : undefined;
    if (choice.method === PAYMENT_METHOD.Ussd && !bank) throw new ApiError(i18n.t('payments:error.chooseBank'), 400);

    const now = new Date();
    const existing = latestFor(order).map((p) => reconcile(p, payable, now));
    if (existing.some((p) => p.status === PAYMENT_STATUS.Paid)) throw new ApiError(i18n.t('payments:error.alreadyPaid'), 409);

    const open = existing.filter((p) => !isFinal(p));
    const reusable = open.find((p) => p.method === choice.method && p.amount === payable.total && (!bank || p.ussd?.bankId === bank.id));
    if (reusable) return { payment: reusable, authorizationUrl: reusable.method === PAYMENT_METHOD.Card ? hostedCheckoutUrl(reusable.reference) : null };
    // Abandoned attempts are closed so only one payment is ever open. A part-paid transfer must be finished first.
    for (const p of open) {
      if (p.amountReceived > 0) throw new ApiError(i18n.t('payments:error.partTransfer'), 409);
      if (p.cash && (p.cash.vendorAmount !== null || p.cash.customerAmount !== null)) {
        throw new ApiError(i18n.t('payments:error.cashConfirmed'), 409);
      }
      save({ ...p, status: PAYMENT_STATUS.Expired, updatedAt: now.toISOString(), outcome: i18n.t('payments:outcome.replaced') });
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
    reviewFlag: i18n.t('payments:outcome.mismatch', { vendor: p.vendorName, vendorAmount: formatNaira(c.vendorAmount), customerAmount: formatNaira(c.customerAmount) })
  };
}

async function confirmCash(reference: string, party: 'vendor' | 'customer', amount: number): Promise<Payment> {
  const current = findPayment(reference);
  const payable = await loadPayable(current.subject);
  return mockResponse(() => {
    const p = findPayment(reference);
    if (p.method !== PAYMENT_METHOD.Cash || !p.cash) throw new ApiError(i18n.t('payments:error.notCash'), 400);
    if (p.status === PAYMENT_STATUS.Paid) throw new ApiError(i18n.t('payments:error.cashAlready'), 409);
    if (!payable.cashConfirmable) throw new ApiError(i18n.t('payments:error.cashNotYet'), 409);
    if (!Number.isInteger(amount) || amount <= 0 || amount > p.amount * CASH_LIMIT_MULTIPLIER) throw new ApiError(i18n.t('payments:error.wholeNaira'), 400);
    const at = new Date().toISOString();
    const cash = party === 'vendor' ? { ...p.cash, vendorAmount: amount, vendorConfirmedAt: at } : { ...p.cash, customerAmount: amount, customerConfirmedAt: at };
    return save(settleCash({ ...p, cash }, at));
  }, MOCK_PSP.latencyMs);
}

/** POST /payments/:reference/cash/vendor — "Cash received (₦amount)". */
export const confirmCashReceived = (reference: string, amount: number) => confirmCash(reference, 'vendor', amount);

/** POST /payments/:reference/cash/customer — "I paid ₦amount". */
export const confirmCashPaid = (reference: string, amount: number) => confirmCash(reference, 'customer', amount);

/* ---------- Reads for the transaction history ---------- */

/** Every payment as stored right now (read-only), for transactionService. Receipts are built there too. */
export const paymentsSnapshot = (): readonly Payment[] => payments;
