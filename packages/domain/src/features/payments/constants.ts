import type { EscrowEventType, PaymentMethod, PaymentStatus, PaymentSubjectKind, TransactionType } from './types';

/** Every payment status, in one place. Shared by jobs and retail orders. */
export const PAYMENT_STATUS = {
  /** Waiting for the customer: popup not finished, transfer not received, USSD not dialled, cash not handed over. */
  Pending: 'pending',
  /** Money is on its way or being checked (transfer settling, cash waiting for both confirmations or review). */
  Processing: 'processing',
  Paid: 'paid',
  Failed: 'failed',
  Expired: 'expired',
  Refunded: 'refunded'
} as const;

/** Statuses that never change again (polling stops on these). */
export const FINAL_PAYMENT_STATUSES: readonly PaymentStatus[] = [PAYMENT_STATUS.Paid, PAYMENT_STATUS.Failed, PAYMENT_STATUS.Expired, PAYMENT_STATUS.Refunded];

export const PAYMENT_METHOD = {
  Card: 'card',
  Transfer: 'transfer',
  Ussd: 'ussd',
  Cash: 'cash'
} as const;

export const PAYMENT_METHOD_META: Record<PaymentMethod, {label: string;description: string;}> = {
  card: { label: 'Card', description: 'Visa, Mastercard or Verve, on our payment partner’s secure page.' },
  transfer: { label: 'Bank transfer', description: 'Send the exact amount to a one-time account number.' },
  ussd: { label: 'USSD', description: 'Dial a code from your bank. No data or app needed.' },
  cash: { label: 'Cash on completion', description: 'Pay the vendor in cash once the work is done.' }
};

/** Display order in the selector. */
export const PAYMENT_METHOD_ORDER: readonly PaymentMethod[] = [PAYMENT_METHOD.Card, PAYMENT_METHOD.Transfer, PAYMENT_METHOD.Ussd, PAYMENT_METHOD.Cash];

export const PAYMENT_SUBJECT = {
  Job: 'job',
  Order: 'order',
  /** A vendor's subscription invoice. Online only: no cash, no escrow. */
  Subscription: 'subscription'
} as const;

/* ---------- Routes ---------- */

export const PAYMENT_ROUTES = {
  checkout: (kind: PaymentSubjectKind, id: string) => `/pay/${kind}/${encodeURIComponent(id)}`,
  receipt: (reference: string) => `/payments/${encodeURIComponent(reference)}/receipt`,
  /** The customer's transaction history. */
  transactions: '/payments',
  transaction: (reference: string) => `/payments/${encodeURIComponent(reference)}`,
  /** The vendor's copy of a customer's receipt (with the commission breakdown). */
  vendorReceipt: (reference: string) => `/pro/payments/${encodeURIComponent(reference)}/receipt`
} as const;

/* ---------- Escrow ---------- */

/** Where held money stands. Totals behind each status come from the ledger. */
export const ESCROW_STATUS = {
  /** Paid in, not yet released to the vendor. */
  Held: 'held',
  /** All of it released to the vendor (less commission). */
  Released: 'released',
  /** All of it returned to the customer. */
  Refunded: 'refunded',
  /** Held while Gwani reviews a reported problem. */
  Disputed: 'disputed',
  /** Some returned to the customer, the rest released to the vendor. */
  PartiallyRefunded: 'partially_refunded'
} as const;

/** Ledger event types. */
export const ESCROW_EVENT = {
  Held: 'held',
  Released: 'released',
  Refunded: 'refunded',
  Disputed: 'disputed',
  PaidOut: 'paid_out'
} as const;

export const ESCROW_EVENT_LABELS: Record<EscrowEventType, string> = {
  held: 'Held',
  released: 'Released to vendor',
  refunded: 'Refunded to customer',
  disputed: 'Held for dispute review',
  paid_out: 'Paid out to vendor'
};

/* ---------- Transaction history ---------- */

/**
 * How a payment reads in the customer's transaction history. Combines the payment status with escrow:
 * paid money still held shows as Held in escrow, and any refund (full or part) shows as Refunded.
 */
export const TRANSACTION_STATUS = {
  Paid: 'paid',
  Held: 'held',
  Pending: 'pending',
  Failed: 'failed',
  Refunded: 'refunded'
} as const;

export const TRANSACTION_TYPE = {
  Service: 'service',
  Retail: 'retail'
} as const;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  service: 'Services',
  retail: 'Retail orders'
};

export const TRANSACTIONS_PAGE_SIZE = 6;
