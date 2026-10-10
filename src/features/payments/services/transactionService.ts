import i18n from '../../../i18n';
import { jobStatusLabel, lgaLabel } from '../../../i18n/labels';
import { endOfDay, isSameMonth, startOfDay } from 'date-fns';
import { currentCustomerId, currentVendorId } from '../../auth/session';
import { fromDateKey } from '../../../lib/dates';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { formatTrade } from '../../../utils/format';
import { JOB_ACTOR, JOB_STATUS, JOB_STATUS_META } from '../../jobs/constants';
import { getJob, runScheduledJobTasks } from '../../jobs/services/jobService';
import { transitionBlockedReason } from '../../jobs/stateMachine';
import { getOrder, runScheduledOrderTasks } from '../../orders/services/orderService';
import { ORDER_ACTOR, ORDER_STATUS } from '../../orders/constants';
import { orderTransitionBlockedReason } from '../../orders/stateMachine';
import { PAYMENT_STATUS, PAYMENT_SUBJECT, TRANSACTION_STATUS, TRANSACTION_TYPE, TRANSACTIONS_PAGE_SIZE } from '../constants';
import { escrowTotals } from '../escrow/escrowRules';
import { buildReceiptBreakdown, buildReceiptDocument, hasReceipt, transactionStatusOf } from '../utils/receiptData';
import { escrowForPayment } from './escrowService';
import { getPaymentStatus, paymentsSnapshot } from './paymentService';
import type { Page } from '../../../types/pagination';
import type { Job } from '../../jobs/types';
import type { Order } from '../../orders/types';
import type {
  Payment,
  ReceiptBusiness,
  ReceiptDocument,
  ReceiptSource,
  ReceiptViewer,
  TransactionDetail,
  TransactionFilters,
  TransactionListItem,
  TransactionSummary } from
'../types';

/*
 * The customer's transaction history and receipts (our backend, mocked). Reads the payment and escrow
 * stores; every receipt, on screen or PDF, for the customer or the vendor, comes from the one mapping in
 * utils/receiptData.ts. Subscription invoices aren't customer transactions and have their own receipts.
 */

/** Most receipts one bulk download may contain. */
const BULK_RECEIPT_LIMIT = 100;

const isCustomersPayment = (p: Payment) => p.customerId === currentCustomerId() && p.subject.kind !== PAYMENT_SUBJECT.Subscription;

function toListItem(p: Payment): TransactionListItem {
  const escrow = escrowForPayment(p.reference);
  return {
    reference: p.reference,
    subject: p.subject,
    type: p.subject.kind === PAYMENT_SUBJECT.Job ? TRANSACTION_TYPE.Service : TRANSACTION_TYPE.Retail,
    description: p.description,
    vendorId: p.vendorId,
    vendorName: p.vendorName,
    amount: p.amount,
    method: p.method,
    status: transactionStatusOf(p, escrow),
    date: p.paidAt ?? p.createdAt,
    refunded: escrow ? escrowTotals(escrow).refunded : p.status === PAYMENT_STATUS.Refunded ? p.amount : 0,
    hasReceipt: hasReceipt(p)
  };
}

function inRange(date: string, from: string, to: string): boolean {
  const at = new Date(date);
  if (from && at < startOfDay(fromDateKey(from))) return false;
  return !(to && at > endOfDay(fromDateKey(to)));
}

function assertRange(from: string, to: string): void {
  if (from && to && fromDateKey(from) > fromDateKey(to)) throw new ApiError(i18n.t('payments:tx.rangeError'), 400);
}

function matches(t: TransactionListItem, f: TransactionFilters): boolean {
  if (f.status !== 'all' && t.status !== f.status) return false;
  if (f.method !== 'all' && t.method !== f.method) return false;
  if (f.type !== 'all' && t.type !== f.type) return false;
  if (!inRange(t.date, f.from, f.to)) return false;
  const q = f.query.trim().toLowerCase();
  return !q || t.reference.toLowerCase().includes(q) || t.vendorName.toLowerCase().includes(q);
}

/**
 * MOCK of the server's scheduled tasks: auto-confirmations release escrow, so run them before reading, as
 * the job and order pages do. Otherwise the list could show Held for money that has already been released.
 */
function catchUp(): void {
  runScheduledJobTasks();
  runScheduledOrderTasks();
}

function customerTransactions(): TransactionListItem[] {
  catchUp();
  return paymentsSnapshot().filter(isCustomersPayment).map(toListItem);
}

/** GET /me/transactions?status&method&type&from&to&q&sort&page — newest first unless sorted otherwise. */
export function listTransactions(filters: TransactionFilters, page: number, pageSize = TRANSACTIONS_PAGE_SIZE): Promise<Page<TransactionListItem>> {
  return mockResponse(() => {
    assertRange(filters.from, filters.to);
    const all = customerTransactions().
    filter((t) => matches(t, filters)).
    sort((a, b) => filters.sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), page, pageSize, total: all.length, hasMore: start + pageSize < all.length };
  });
}

/** GET /me/transactions/summary — this month's spending, money still pending, and refunds. */
export function getTransactionSummary(now = new Date()): Promise<TransactionSummary> {
  return mockResponse(() => {
    const all = customerTransactions();
    const moved = all.filter((t) => t.hasReceipt);
    return {
      spentThisMonth: moved.filter((t) => isSameMonth(new Date(t.date), now)).reduce((s, t) => s + t.amount - t.refunded, 0),
      heldInEscrow: moved.filter((t) => t.status === TRANSACTION_STATUS.Held).reduce((s, t) => s + t.amount, 0),
      pending: all.filter((t) => t.status === TRANSACTION_STATUS.Pending).reduce((s, t) => s + t.amount, 0),
      refunded: moved.reduce((s, t) => s + t.refunded, 0)
    };
  }, 300);
}

/* ---------- One transaction ---------- */

/** Only the customer who paid, or the vendor who was paid, can see a payment. */
function ownedPayment(reference: string, viewer: ReceiptViewer): Payment {
  const p = paymentsSnapshot().find((x) => x.reference === reference);
  const mine = p && (viewer === 'customer' ? isCustomersPayment(p) : p.vendorId === currentVendorId() && p.subject.kind !== PAYMENT_SUBJECT.Subscription);
  if (!p || !mine) throw new ApiError(i18n.t('payments:error.notFound'), 404);
  return p;
}

function businessOf(vendorId: string, fallbackName: string): ReceiptBusiness {
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  return {
    name: vendor?.name ?? fallbackName,
    trade: vendor ? formatTrade(vendor) : null,
    location: vendor ? i18n.t('payments:receipt.location', { lga: lgaLabel(vendor.lga) }) : null
  };
}

/** Gathers what the receipt mapping needs: the job's agreed price and fee, or the order's items and delivery. */
async function receiptSource(payment: Payment): Promise<{source: ReceiptSource;job: Job | null;order: Order | null;}> {
  let job: Job | null = null;
  let order: Order | null = null;
  let items: ReceiptSource['items'] = [];
  let deliveryFee = 0;
  try {
    if (payment.subject.kind === PAYMENT_SUBJECT.Job) {
      job = await getJob(payment.subject.id);
      items = [{ label: i18n.t('payments:payable.agreedPrice', { service: job.serviceName ?? i18n.t('payments:payable.serviceFallback') }), amount: job.agreedPrice ?? payment.amount }];
    } else {
      order = await getOrder(payment.subject.id);
      items = order.items.filter((i) => !i.outOfStock).map((i) => ({ label: `${i.quantity} × ${i.name}`, amount: i.unitPrice * i.quantity }));
      deliveryFee = order.deliveryFee;
    }
  } catch (e) {
    // The job or order is gone: the receipt falls back to one line for what was paid.
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }
  return {
    job,
    order,
    source: {
      payment,
      escrow: escrowForPayment(payment.reference),
      items,
      deliveryFee,
      cancellationFee: job?.cancellation?.fee ?? 0,
      vendor: businessOf(payment.vendorId, payment.vendorName)
    }
  };
}

/** Why the customer can't report a problem from this payment right now (null when they can). Same rules as the job and order pages. */
function reportBlockedReason(payment: Payment, job: Job | null, order: Order | null): string | null {
  if (payment.subject.kind === PAYMENT_SUBJECT.Order) {
    if (!order) return i18n.t('payments:error.orderLoad');
    if (order.dispute) return i18n.t('payments:error.orderDisputed');
    if (!orderTransitionBlockedReason(order, ORDER_STATUS.Disputed, ORDER_ACTOR.Customer)) return null;
    return i18n.t('payments:error.orderReportWhen');
  }
  if (!job) return i18n.t('payments:error.jobLoad');
  if (job.dispute) return i18n.t('payments:error.jobDisputed');
  if (!transitionBlockedReason(job, JOB_STATUS.Disputed, JOB_ACTOR.Customer)) return null;
  return i18n.t('payments:error.jobReportWhen', { status: jobStatusLabel(job.status, JOB_STATUS_META[job.status].label).toLowerCase() });
}

/** GET /me/transactions/:reference — brought up to date with the provider and escrow first. */
export async function getTransaction(reference: string): Promise<TransactionDetail> {
  ownedPayment(reference, 'customer');
  const payment = await getPaymentStatus(reference);
  const { source, job, order } = await receiptSource(payment);
  return mockResponse(
    () => ({
      transaction: toListItem(payment),
      payment,
      escrow: source.escrow,
      breakdown: buildReceiptBreakdown(source),
      vendor: source.vendor,
      reportBlockedReason: reportBlockedReason(payment, job, order)
    }),
    150
  );
}

/* ---------- Receipts ---------- */

/**
 * GET /payments/:reference/receipt?as=customer|vendor — the receipt (or refund note) for money that moved.
 * The vendor's copy is the same document with the commission breakdown.
 */
export async function getReceiptDocument(reference: string, viewer: ReceiptViewer): Promise<ReceiptDocument> {
  ownedPayment(reference, viewer);
  const payment = await getPaymentStatus(reference);
  if (!hasReceipt(payment)) throw new ApiError(i18n.t('payments:error.noReceipt'), 409);
  const { source } = await receiptSource(payment);
  return mockResponse(() => buildReceiptDocument(source, viewer), 150);
}

/** GET /me/receipts?from&to — every receipt in the date range (by payment date), oldest first, for one PDF. */
export async function listReceiptDocuments(from: string, to: string): Promise<ReceiptDocument[]> {
  assertRange(from, to);
  catchUp();
  const payments = paymentsSnapshot().filter((p) => isCustomersPayment(p) && hasReceipt(p) && inRange(p.paidAt ?? p.createdAt, from, to));
  if (payments.length > BULK_RECEIPT_LIMIT) throw new ApiError(i18n.t('payments:error.tooManyReceipts', { max: BULK_RECEIPT_LIMIT }), 400);
  const sources = await Promise.all(payments.map(receiptSource));
  return mockResponse(() => sources.map(({ source }) => buildReceiptDocument(source, 'customer')).sort((a, b) => a.issuedAt.localeCompare(b.issuedAt)), 300);
}
