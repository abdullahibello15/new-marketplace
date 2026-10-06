import type { EscrowEventType, EscrowStatus, PaymentMethod, PaymentStatus, PaymentSubjectKind } from './types';

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

export const PAYMENT_STATUS_META: Record<PaymentStatus, {label: string;badgeClass: string;dotClass: string;}> = {
  pending: { label: 'Awaiting payment', badgeClass: 'bg-[#F7EBCB] text-mustard-dark', dotClass: 'bg-mustard-dark' },
  processing: { label: 'Processing', badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]', dotClass: 'bg-[#2B4A7A]' },
  paid: { label: 'Paid', badgeClass: 'bg-pine text-white', dotClass: 'bg-white' },
  failed: { label: 'Failed', badgeClass: 'bg-clay-soft text-clay-dark', dotClass: 'bg-clay-dark' },
  expired: { label: 'Expired', badgeClass: 'bg-sand text-muted', dotClass: 'bg-muted' },
  refunded: { label: 'Refunded', badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' }
};

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
  receipt: (reference: string) => `/payments/${encodeURIComponent(reference)}/receipt`
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

export const ESCROW_STATUS_META: Record<EscrowStatus, {label: string;badgeClass: string;dotClass: string;}> = {
  held: { label: 'Held in escrow', badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]', dotClass: 'bg-[#2B4A7A]' },
  released: { label: 'Released', badgeClass: 'bg-pine text-white', dotClass: 'bg-white' },
  refunded: { label: 'Refunded', badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' },
  disputed: { label: 'Disputed: on hold', badgeClass: 'bg-[#8F3916] text-white', dotClass: 'bg-white' },
  partially_refunded: { label: 'Partially refunded', badgeClass: 'bg-[#F7EBCB] text-mustard-dark', dotClass: 'bg-mustard-dark' }
};

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
