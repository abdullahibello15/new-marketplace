import { JOB_ROUTES } from '../../jobs/constants';
import { ORDER_ROUTES } from '../../orders/constants';
import { PAYMENT_SUBJECT } from '../constants';
import type { PaymentSubjectRef } from '../types';

/** The customer's page for the job or order a payment is for. */
export const subjectPath = (subject: PaymentSubjectRef) => subject.kind === PAYMENT_SUBJECT.Job ? JOB_ROUTES.job(subject.id) : ORDER_ROUTES.order(subject.id);

export const isSubjectKind = (v: string | undefined): v is PaymentSubjectRef['kind'] => v === PAYMENT_SUBJECT.Job || v === PAYMENT_SUBJECT.Order;
