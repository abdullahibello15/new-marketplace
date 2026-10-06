import { useCallback, useEffect, useRef, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { ApiError } from '../../../services/mockApi';
import { FINAL_PAYMENT_STATUSES, PAYMENT_STATUS } from '../constants';
import { getPaymentOverview, initiatePayment } from '../services/paymentService';
import type { Payment, PaymentInitiation, PaymentMethod, PaymentMethodChoice, PaymentSubjectRef } from '../types';

/**
 * State for the payment screen: what's owed, the chosen method, and the open payment. `initiate` is
 * locked while a request is in flight so a double tap can never start two payments (the server is
 * idempotent too). An unfinished transfer, USSD or cash payment is picked up where it was left.
 */
export function usePaymentCheckout(subject: PaymentSubjectRef) {
  const toast = useToast();
  const { kind, id } = subject;
  const load = useCallback(
    () =>
    getPaymentOverview({ kind, id }).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    [kind, id]
  );
  const overview = useAsyncData(load);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [starting, setStarting] = useState(false);
  const lock = useRef(false);

  // Resume an open payment, or pre-select the first method.
  useEffect(() => {
    const data = overview.data;
    if (!data) return;
    const open = data.payment && !FINAL_PAYMENT_STATUSES.includes(data.payment.status) ? data.payment : null;
    setPayment((current) => current ?? open ?? (data.payment?.status === PAYMENT_STATUS.Paid ? data.payment : null));
    setMethod((current) => current ?? open?.method ?? data.payable.methods[0] ?? null);
  }, [overview.data]);

  const initiate = useCallback(
    async (choice: PaymentMethodChoice): Promise<PaymentInitiation | null> => {
      if (lock.current) return null;
      lock.current = true;
      setStarting(true);
      try {
        const result = await initiatePayment({ kind, id }, choice);
        setPayment(result.payment);
        return result;
      } catch (e) {
        toast.error(errorMessage(e));
        return null;
      } finally {
        lock.current = false;
        setStarting(false);
      }
    },
    [kind, id, toast]
  );

  /** Pick a different method. The open payment is left for the server to replace on the next initiate. */
  function chooseMethod(next: PaymentMethod) {
    setMethod(next);
    if (payment && payment.method !== next && payment.status !== PAYMENT_STATUS.Paid) setPayment(null);
  }

  return {
    overview,
    notFound: overview.status === 'success' && overview.data === null,
    payment,
    updatePayment: setPayment,
    method,
    chooseMethod,
    initiate,
    starting
  };
}
