import { JOB_ROUTES } from '../../jobs/constants';
import { ORDER_ROUTES } from '../../orders/constants';
import { DASHBOARD_ROUTES } from '../../vendor-dashboard/constants';
import { PAYMENT_ROUTES, PAYMENT_SUBJECT } from '../constants';
import type { Payment, PaymentSubjectRef } from '../types';

/** The page a payment is about: the customer's job or order, or the vendor's subscription. */
export function subjectPath(subject: PaymentSubjectRef): string {
  if (subject.kind === PAYMENT_SUBJECT.Subscription) return DASHBOARD_ROUTES.subscription;
  return subject.kind === PAYMENT_SUBJECT.Job ? JOB_ROUTES.job(subject.id) : ORDER_ROUTES.order(subject.id);
}

/** Where the receipt lives: subscription invoices have theirs in the vendor portal's billing history. */
export const receiptPathFor = (payment: Pick<Payment, 'reference' | 'subject'>) =>
payment.subject.kind === PAYMENT_SUBJECT.Subscription ? DASHBOARD_ROUTES.invoice(payment.subject.id) : PAYMENT_ROUTES.receipt(payment.reference);

export const isSubjectKind = (v: string | undefined): v is PaymentSubjectRef['kind'] =>
v === PAYMENT_SUBJECT.Job || v === PAYMENT_SUBJECT.Order || v === PAYMENT_SUBJECT.Subscription;
