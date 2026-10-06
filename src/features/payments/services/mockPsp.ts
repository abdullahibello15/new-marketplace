import { MOCK_PSP } from '../config';
import type { NigerianBank } from '../../../data/nigerianBanks';
import type { PaymentMethod } from '../types';

/*
 * MOCK payment service provider (think Paystack or Flutterwave). This file stands in for the PSP's
 * own systems: hosted checkout, one-time transfer accounts, USSD charges, and the "verify transaction"
 * API. Replace it with the real SDK and server-side verification calls; nothing else should need to
 * know it was ever fake.
 *
 * It never sees or stores card numbers, CVVs or PINs either: on the real hosted page the customer
 * types those into the PSP's own form, and all we get back is a reference and a result.
 */

type PspState = 'pending' | 'success' | 'failed';

interface Incoming {
  amount: number;
  arrivesAt: number;
}

interface PspTransaction {
  reference: string;
  channel: Exclude<PaymentMethod, 'cash'>;
  amount: number;
  state: PspState;
  amountReceived: number;
  /** Money (transfers) or approvals (USSD) on their way. */
  incoming: Incoming[];
  ussdOutcome: {approve: boolean;arrivesAt: number;} | null;
  failureReason: string | null;
}

const transactions = new Map<string, PspTransaction>();

/** The PSP's view of a transaction, as its verify endpoint would report it. */
export interface PspStatus {
  state: PspState;
  amountReceived: number;
  /** A transfer or USSD approval is on its way but hasn't landed yet. */
  settling: boolean;
  failureReason: string | null;
}

export function createTransaction(reference: string, channel: PspTransaction['channel'], amount: number): void {
  transactions.set(reference, { reference, channel, amount, state: 'pending', amountReceived: 0, incoming: [], ussdOutcome: null, failureReason: null });
}

/** Where the hosted card page would be. The simulated popup takes its place. */
export const hostedCheckoutUrl = (reference: string) => `https://checkout.paygate.example/pay/${encodeURIComponent(reference)}`;

/** A one-time account number tied to this reference (deterministic, so the same reference shows the same number). */
export function issueVirtualAccount(reference: string): {bankName: string;accountNumber: string;accountName: string;} {
  let hash = 0;
  for (const ch of reference) hash = hash * 31 + ch.charCodeAt(0) >>> 0;
  return {
    bankName: MOCK_PSP.transferBankName,
    accountNumber: `9${String(hash).padStart(9, '0').slice(-9)}`,
    accountName: `Gwani Checkout ${reference.slice(-6)}`
  };
}

export function issueUssdCode(reference: string, bank: NigerianBank): string {
  const token = String(reference.split('').reduce((sum, ch) => sum + ch.charCodeAt(0) * 7, 0) % 10000).padStart(4, '0');
  return `${bank.ussdPrefix}*000*${token}#`;
}

/* ---------- What the simulated popup and "Demo" controls call ---------- */

/** The hosted page finished: the card was charged or declined. */
export function completeHostedCheckout(reference: string, outcome: 'success' | 'declined'): void {
  const tx = transactions.get(reference);
  if (!tx || tx.state !== 'pending') return;
  if (outcome === 'success') {
    tx.state = 'success';
    tx.amountReceived = tx.amount;
  } else {
    tx.state = 'failed';
    tx.failureReason = 'Your bank declined the card. No money was taken.';
  }
}

/** The customer's bank sends `amount` to the one-time account; it lands after the settlement delay. */
export function simulateIncomingTransfer(reference: string, amount: number): void {
  const tx = transactions.get(reference);
  if (!tx || amount <= 0) return;
  tx.incoming.push({ amount, arrivesAt: Date.now() + MOCK_PSP.settlementDelayMs });
}

/** The customer approves (or cancels) the USSD prompt on their phone. */
export function simulateUssdResponse(reference: string, approve: boolean): void {
  const tx = transactions.get(reference);
  if (!tx || tx.state !== 'pending') return;
  tx.ussdOutcome = { approve, arrivesAt: Date.now() + MOCK_PSP.settlementDelayMs };
}

/* ---------- The PSP's verify API ---------- */

/** GET /transaction/verify/:reference on the PSP. Null if the PSP has never heard of it. */
export function queryTransaction(reference: string, now = Date.now()): PspStatus | null {
  const tx = transactions.get(reference);
  if (!tx) return null;
  const landed = tx.incoming.filter((i) => i.arrivesAt <= now);
  if (landed.length) {
    tx.amountReceived += landed.reduce((sum, i) => sum + i.amount, 0);
    tx.incoming = tx.incoming.filter((i) => i.arrivesAt > now);
    if (tx.channel === 'transfer' && tx.amountReceived >= tx.amount) tx.state = 'success';
  }
  if (tx.ussdOutcome && tx.ussdOutcome.arrivesAt <= now && tx.state === 'pending') {
    if (tx.ussdOutcome.approve) {
      tx.state = 'success';
      tx.amountReceived = tx.amount;
    } else {
      tx.state = 'failed';
      tx.failureReason = 'The payment was cancelled on your phone. No money was taken.';
    }
  }
  const settling = tx.incoming.length > 0 || tx.ussdOutcome !== null && tx.ussdOutcome.arrivesAt > now;
  return { state: tx.state, amountReceived: tx.amountReceived, settling, failureReason: tx.failureReason };
}
