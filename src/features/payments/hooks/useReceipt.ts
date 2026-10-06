import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getReceipt } from '../services/paymentService';

/** The receipt for one payment reference. */
export function useReceipt(reference: string) {
  const load = useCallback(() => getReceipt(reference), [reference]);
  return useAsyncData(load);
}
