import { user } from '../../../data/user';
import { CURRENT_CUSTOMER_ID } from '../../jobs/constants';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_SUBJECT } from '../constants';
import type { Payment, PaymentMethod, PaymentStatus, PaymentSubjectKind } from '../types';

/* Mock payments, relative to now. No card data anywhere: card payments are just a reference and a result. */

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

interface Seed {
  reference: string;
  kind: PaymentSubjectKind;
  id: string;
  description: string;
  vendorId: string;
  vendorName: string;
  customerName?: string;
  customerId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  hoursAgo: number;
  cash?: Payment['cash'];
  reviewFlag?: string;
  transfer?: Payment['transfer'];
  ussd?: Payment['ussd'];
}

function payment(seed: Seed): Payment {
  const at = ago(seed.hoursAgo);
  const paid = seed.status === PAYMENT_STATUS.Paid;
  return {
    reference: seed.reference,
    subject: { kind: seed.kind, id: seed.id },
    vendorId: seed.vendorId,
    vendorName: seed.vendorName,
    customerId: seed.customerId ?? CURRENT_CUSTOMER_ID,
    customerName: seed.customerName ?? user.fullName,
    description: seed.description,
    amount: seed.amount,
    method: seed.method,
    status: seed.status,
    createdAt: at,
    updatedAt: at,
    expiresAt: null,
    paidAt: paid ? at : null,
    amountReceived: paid ? seed.amount : 0,
    outcome: null,
    transfer: seed.transfer ?? null,
    ussd: seed.ussd ?? null,
    cash: seed.cash ?? null,
    reviewFlag: seed.reviewFlag ?? null
  };
}

const BALA = { vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services' };
const HAUWA = { vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara' };

export const mockPayments: Payment[] = [
// Paid online.
payment({ reference: 'GW-SEED-2284', kind: PAYMENT_SUBJECT.Job, id: '2284', description: 'Job #2284 · Custom Ankara outfit', ...HAUWA, amount: 18000, method: PAYMENT_METHOD.Card, status: PAYMENT_STATUS.Paid, hoursAgo: 13 * 24 }),
payment({
  reference: 'GW-SEED-2293',
  kind: PAYMENT_SUBJECT.Job,
  id: '2293',
  description: 'Job #2293 · Alterations',
  ...HAUWA,
  amount: 4000,
  method: PAYMENT_METHOD.Transfer,
  status: PAYMENT_STATUS.Paid,
  hoursAgo: 6 * 24,
  transfer: { bankName: 'Wema Bank', accountNumber: '9012448871', accountName: 'Gwani Checkout ED-2293' }
}),
payment({
  reference: 'GW-SEED-5007',
  kind: PAYMENT_SUBJECT.Order,
  id: '5007',
  description: 'Order #5007',
  ...HAUWA,
  amount: 9000,
  method: PAYMENT_METHOD.Ussd,
  status: PAYMENT_STATUS.Paid,
  hoursAgo: 47,
  ussd: { bankId: 'gtbank', bankName: 'GTBank', code: '*737*000*5007#' }
}),
// The demo vendor's online payments (escrow seeds in mock/escrows.ts): held, disputed, released and paid out.
payment({ reference: 'GW-SEED-2313', kind: PAYMENT_SUBJECT.Job, id: '2313', description: 'Job #2313 · Water tank installation', ...BALA, customerName: 'Ngozi Adeyemi', customerId: 'cust-ngozi-adeyemi', amount: 35000, method: PAYMENT_METHOD.Transfer, status: PAYMENT_STATUS.Paid, hoursAgo: 24, transfer: { bankName: 'Wema Bank', accountNumber: '9013372205', accountName: 'Gwani Checkout ED-2313' } }),
payment({ reference: 'GW-SEED-2316', kind: PAYMENT_SUBJECT.Job, id: '2316', description: 'Job #2316 · Pipe fitting & repair', ...BALA, customerName: 'Fatima Bello', customerId: 'cust-fatima-bello', amount: 9200, method: PAYMENT_METHOD.Card, status: PAYMENT_STATUS.Paid, hoursAgo: 48 }),
payment({ reference: 'GW-SEED-2318', kind: PAYMENT_SUBJECT.Job, id: '2318', description: 'Job #2318 · Water tank installation', ...BALA, customerName: 'Grace Ibrahim', customerId: 'cust-grace-ibrahim', amount: 33100, method: PAYMENT_METHOD.Card, status: PAYMENT_STATUS.Paid, hoursAgo: 8 * 24 }),
payment({ reference: 'GW-SEED-2319', kind: PAYMENT_SUBJECT.Job, id: '2319', description: 'Job #2319 · Drain unblocking', ...BALA, customerName: 'Emeka Nwosu', customerId: 'cust-emeka-nwosu', amount: 5500, method: PAYMENT_METHOD.Ussd, status: PAYMENT_STATUS.Paid, hoursAgo: 48, ussd: { bankId: 'access', bankName: 'Access Bank', code: '*901*000*2319#' } }),
// Cash: Aisha's plumbing job is done; she still has to confirm what she paid (Bala can confirm in his dashboard).
payment({
  reference: 'GW-SEED-2297',
  kind: PAYMENT_SUBJECT.Job,
  id: '2297',
  description: 'Job #2297 · Shower repair',
  ...BALA,
  amount: 8000,
  method: PAYMENT_METHOD.Cash,
  status: PAYMENT_STATUS.Pending,
  hoursAgo: 48,
  cash: { vendorAmount: null, vendorConfirmedAt: null, customerAmount: null, customerConfirmedAt: null }
}),
// Cash, both sides agreed.
payment({
  reference: 'GW-SEED-5004',
  kind: PAYMENT_SUBJECT.Order,
  id: '5004',
  description: 'Order #5004',
  ...BALA,
  amount: 17000,
  method: PAYMENT_METHOD.Cash,
  status: PAYMENT_STATUS.Paid,
  hoursAgo: 4 * 24,
  cash: { vendorAmount: 17000, vendorConfirmedAt: ago(4 * 24), customerAmount: 17000, customerConfirmedAt: ago(4 * 24 - 1) }
}),
// Cash, the two sides disagree: held for review.
payment({
  reference: 'GW-SEED-2317',
  kind: PAYMENT_SUBJECT.Job,
  id: '2317',
  description: 'Job #2317 · Toilet cistern repair',
  ...BALA,
  customerName: 'Salisu Tanko',
  customerId: 'cust-salisu-tanko',
  amount: 12000,
  method: PAYMENT_METHOD.Cash,
  status: PAYMENT_STATUS.Processing,
  hoursAgo: 40,
  cash: { vendorAmount: 10000, vendorConfirmedAt: ago(41), customerAmount: 12000, customerConfirmedAt: ago(40) },
  reviewFlag:
  'The amounts don’t match: Bala Plumbing Services says ₦10,000 was received, the customer says ₦12,000 was paid. Gwani’s team will review it and contact you both.'
})];
