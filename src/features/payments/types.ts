import type { ESCROW_EVENT, ESCROW_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_SUBJECT } from './constants';

type ValueOf<T> = T[keyof T];

export type PaymentStatus = ValueOf<typeof PAYMENT_STATUS>;
export type PaymentMethod = ValueOf<typeof PAYMENT_METHOD>;
export type PaymentSubjectKind = ValueOf<typeof PAYMENT_SUBJECT>;

/** What's being paid for: a service job or one vendor's retail order. The server works out the amount from it. */
export interface PaymentSubjectRef {
  kind: PaymentSubjectKind;
  id: string;
}

/** How the customer chose to pay. USSD also needs their bank. */
export type PaymentMethodChoice =
{method: typeof PAYMENT_METHOD.Card;} |
{method: typeof PAYMENT_METHOD.Transfer;} |
{method: typeof PAYMENT_METHOD.Ussd;bankId: string;} |
{method: typeof PAYMENT_METHOD.Cash;};

export interface TransferDetails {
  bankName: string;
  /** One-time account for this payment only. */
  accountNumber: string;
  accountName: string;
}

export interface UssdDetails {
  bankId: string;
  bankName: string;
  /** The full code to dial, e.g. "*737*000*4821#". */
  code: string;
}

/** Cash on completion: each side states the amount; Paid when they match. */
export interface CashConfirmation {
  vendorAmount: number | null;
  vendorConfirmedAt: string | null;
  customerAmount: number | null;
  customerConfirmedAt: string | null;
}

/**
 * One payment attempt. Holds no card numbers, CVVs or PINs: those only ever exist on the payment
 * provider's hosted page. The `reference` is what we ask the provider about.
 */
export interface Payment {
  reference: string;
  subject: PaymentSubjectRef;
  vendorId: string;
  vendorName: string;
  customerId: string;
  customerName: string;
  /** e.g. "Job #2291 · Pipe fitting & repair" */
  description: string;
  /** Whole Naira, set by the server from the job or order. */
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  /** When the transfer account, USSD code or card session stops working; null for cash. */
  expiresAt: string | null;
  paidAt: string | null;
  /** Transfers: how much has arrived so far. */
  amountReceived: number;
  /** What happened, in words the customer understands: decline reason, short/extra amount, refund. */
  outcome: string | null;
  transfer: TransferDetails | null;
  ussd: UssdDetails | null;
  cash: CashConfirmation | null;
  /** Set when the two cash confirmations disagree; Gwani's team then reviews it. */
  reviewFlag: string | null;
}

/** A job or order as the payment screen sees it. */
export interface Payable {
  subject: PaymentSubjectRef;
  title: string;
  vendorId: string;
  vendorName: string;
  customerId: string;
  customerName: string;
  /** Summary lines, e.g. items or the agreed job price, then delivery. */
  lines: {label: string;amount: number;}[];
  total: number;
  /** Null when it can be paid; otherwise why not (not booked yet, cancelled…). */
  blockedReason: string | null;
  /** Methods that apply to this job or order, in display order. */
  methods: PaymentMethod[];
  /** Why cash isn't offered, if it isn't. */
  cashUnavailableReason: string | null;
  /** True once the vendor marked the work done (job) or the order collected, so cash can be confirmed. */
  cashConfirmable: boolean;
  /** The customer has confirmed the job or order (or it auto-confirmed): money paid now is released straight away. */
  fulfilled: boolean;
  /** Where "back" goes: the customer's job or order page. */
  returnPath: string;
}

/** What initiatePayment returns: the payment, plus where the hosted card page is (card only). */
export interface PaymentInitiation {
  payment: Payment;
  /** MOCK hosted-checkout URL. Never stored; used once to open the popup. */
  authorizationUrl: string | null;
}

export interface PaymentOverview {
  payable: Payable;
  /** The latest payment for this job or order, if any. */
  payment: Payment | null;
  /** Escrow for that payment (online payments only). */
  escrow: Escrow | null;
}

export interface Receipt {
  payment: Payment;
  lines: {label: string;amount: number;}[];
  issuedAt: string;
}

/* ---------- Escrow ---------- */

export type EscrowStatus = ValueOf<typeof ESCROW_STATUS>;
export type EscrowEventType = ValueOf<typeof ESCROW_EVENT>;

/** One line in the escrow ledger. Amounts are whole Naira. Never edited, only appended. */
export interface EscrowLedgerEntry {
  id: string;
  type: EscrowEventType;
  at: string;
  /** Gross amount moved by this event (for paid_out: the net amount sent to the vendor). */
  amount: number;
  /** Platform commission taken (released entries only; 0 otherwise). */
  commission: number;
  note: string | null;
  /** Released entries: when the vendor was paid out; null while it's still in their available balance. */
  paidOutAt: string | null;
}

/**
 * Money held for one online payment until the work is done. Cash payments never get one.
 * Totals (held, released, refunded) are always derived from the ledger, never stored twice.
 */
export interface Escrow {
  paymentReference: string;
  subject: PaymentSubjectRef;
  vendorId: string;
  vendorName: string;
  customerName: string;
  description: string;
  method: PaymentMethod;
  /** What the customer paid in. */
  gross: number;
  status: EscrowStatus;
  ledger: EscrowLedgerEntry[];
}

/** Derived amounts for an escrow (see escrowRules.escrowTotals). */
export interface EscrowTotals {
  /** Still held: not yet released or refunded. */
  held: number;
  released: number;
  refunded: number;
  commission: number;
  /** What the vendor receives from what's been released. */
  vendorNet: number;
}

/** The vendor's money in three buckets, net of commission. */
export interface EarningsBuckets {
  /** Held in escrow (what they'll get once released). */
  pending: number;
  /** Released, waiting for payout. */
  available: number;
  paidOut: number;
}
