import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getPaymentOverview } from '../services/paymentService';
import type { Payment, PaymentSubjectKind } from '../types';

/**
 * The payment state for one job or order, for the job/order pages. `refreshKey` (the job's or order's
 * updatedAt) reloads it when the work moves on, e.g. once the vendor marks it done and cash can be confirmed.
 */
export function useSubjectPayment(kind: PaymentSubjectKind, id: string, refreshKey: string) {
  const load = useCallback(
    () => getPaymentOverview({ kind, id }),
    // refreshKey is only a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, id, refreshKey]
  );
  const data = useAsyncData(load);
  const { setData } = data;
  const replacePayment = useCallback((payment: Payment) => setData((prev) => ({ ...prev, payment })), [setData]);
  return { ...data, replacePayment };
}
