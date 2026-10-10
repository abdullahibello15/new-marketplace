import { DEMO_CUSTOMER } from '../../auth/mock/users';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_SUBJECT } from '../constants';
import { mockJobs } from '../../jobs/mock/jobs';
import { mockOrders } from '../../orders/mock/orders';
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
  outcome?: string;
  /** Unpaid attempts: when the account, code or card session stopped working. */
  expiredHoursAgo?: number;
}

function payment(seed: Seed): Payment {
  const at = ago(seed.hoursAgo);
  // Refunded payments were paid first.
  const paid = seed.status === PAYMENT_STATUS.Paid || seed.status === PAYMENT_STATUS.Refunded;
  return {
    reference: seed.reference,
    subject: { kind: seed.kind, id: seed.id },
    vendorId: seed.vendorId,
    vendorName: seed.vendorName,
    customerId: seed.customerId ?? DEMO_CUSTOMER.id,
    customerName: seed.customerName ?? DEMO_CUSTOMER.name,
    description: seed.description,
    amount: seed.amount,
    method: seed.method,
    status: seed.status,
    createdAt: at,
    updatedAt: at,
    expiresAt: seed.expiredHoursAgo === undefined ? null : ago(seed.expiredHoursAgo),
    paidAt: paid ? at : null,
    amountReceived: paid ? seed.amount : 0,
    outcome: seed.outcome ?? null,
    transfer: seed.transfer ?? null,
    ussd: seed.ussd ?? null,
    cash: seed.cash ?? null,
    reviewFlag: seed.reviewFlag ?? null
  };
}

const BALA = { vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services' };
const HAUWA = { vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara' };
const FATIMA = { vendorId: 'fatima-fresh-foods', vendorName: 'Fatima Fresh Foods' };
const IBRAHIM = { vendorId: 'ibrahim-electrical', vendorName: 'Ibrahim Electrical Works' };

const basePayments: Payment[] = [
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
// Aisha's transaction history: one of each status (escrow seeds in mock/escrows.ts).
// Delivered order, held until she confirms receipt.
payment({ reference: 'GW-SEED-5006', kind: PAYMENT_SUBJECT.Order, id: '5006', description: 'Order #5006', ...FATIMA, amount: 10000, method: PAYMENT_METHOD.Card, status: PAYMENT_STATUS.Paid, hoursAgo: 47 }),
// Out of stock after she paid: refunded in full from escrow.
payment({
  reference: 'GW-SEED-5002',
  kind: PAYMENT_SUBJECT.Order,
  id: '5002',
  description: 'Order #5002',
  ...FATIMA,
  amount: 17000,
  method: PAYMENT_METHOD.Transfer,
  status: PAYMENT_STATUS.Refunded,
  hoursAgo: 9 * 24 + 1,
  transfer: { bankName: 'Wema Bank', accountNumber: '9014420502', accountName: 'Gwani Checkout ED-5002' },
  outcome: 'Order didn’t go ahead: full refund. ₦17,000 returned to you (mock).'
}),
// A declined card for an order she hasn't paid for yet.
payment({
  reference: 'GW-SEED-5011F',
  kind: PAYMENT_SUBJECT.Order,
  id: '5011',
  description: 'Order #5011',
  ...FATIMA,
  amount: 18500,
  method: PAYMENT_METHOD.Card,
  status: PAYMENT_STATUS.Failed,
  hoursAgo: 20,
  outcome: 'Your bank declined the card (insufficient funds). No money was taken.'
}),
// A transfer account that expired before any money arrived.
payment({
  reference: 'GW-SEED-2291X',
  kind: PAYMENT_SUBJECT.Job,
  id: '2291',
  description: 'Job #2291 · Pipe fitting & repair',
  ...BALA,
  amount: 6500,
  method: PAYMENT_METHOD.Transfer,
  status: PAYMENT_STATUS.Expired,
  hoursAgo: 30,
  expiredHoursAgo: 29.5,
  transfer: { bankName: 'Wema Bank', accountNumber: '9015562291', accountName: 'Gwani Checkout ED-2291' },
  outcome: 'This payment expired before any money arrived. Start a new one to try again.'
}),
// Last month: cancelled late, so refunded less the late-cancellation fee (job #2280).
payment({ reference: 'GW-SEED-2280', kind: PAYMENT_SUBJECT.Job, id: '2280', description: 'Job #2280 · Ceiling fan installation', ...IBRAHIM, amount: 8000, method: PAYMENT_METHOD.Card, status: PAYMENT_STATUS.Paid, hoursAgo: 27 * 24 - 2 }),
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

/** When something happened, as hours ago (for the seed helper). */
const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

/**
 * Card or transfer payments for every disputed job and order that doesn't already have one, paid when the
 * job was booked or the order placed. Their escrow (held, then disputed, then any resolution) is in escrows.ts.
 */
function disputePayments(existing: Payment[]): Payment[] {
  const paid = new Set(existing.map((p) => `${p.subject.kind}:${p.subject.id}`));
  const jobs = mockJobs.
  filter((j) => j.dispute && j.agreedPrice && !paid.has(`job:${j.id}`)).
  map((j, i) =>
  payment({
    reference: `GW-DSP-J${j.id}`,
    kind: PAYMENT_SUBJECT.Job,
    id: j.id,
    description: `Job #${j.id}${j.serviceName ? ` · ${j.serviceName}` : ''}`,
    vendorId: j.vendorId,
    vendorName: j.vendorName,
    customerId: j.customerId,
    customerName: j.customerName,
    amount: j.agreedPrice ?? 0,
    method: i % 3 === 1 ? PAYMENT_METHOD.Transfer : PAYMENT_METHOD.Card,
    status: PAYMENT_STATUS.Paid,
    hoursAgo: hoursSince(j.history.find((h) => h.status === 'scheduled')?.at ?? j.createdAt),
    transfer: i % 3 === 1 ? { bankName: 'Wema Bank', accountNumber: `90177${j.id}0`, accountName: `Gwani Checkout ED-${j.id}` } : undefined
  })
  );
  const orders = mockOrders.
  filter((o) => o.dispute && !paid.has(`order:${o.id}`)).
  map((o) =>
  payment({
    reference: `GW-DSP-O${o.id}`,
    kind: PAYMENT_SUBJECT.Order,
    id: o.id,
    description: `Order #${o.id}`,
    vendorId: o.vendorId,
    vendorName: o.vendorName,
    customerId: o.customerId,
    customerName: o.customerName,
    amount: o.total,
    method: PAYMENT_METHOD.Card,
    status: PAYMENT_STATUS.Paid,
    hoursAgo: hoursSince(o.createdAt)
  })
  );
  return [...jobs, ...orders];
}

export const mockPayments: Payment[] = [...basePayments, ...disputePayments(basePayments)];
