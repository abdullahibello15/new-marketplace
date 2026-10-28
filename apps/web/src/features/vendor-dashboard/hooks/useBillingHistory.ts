import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getInvoice, listInvoices } from '../services/subscriptionService';

/** Every subscription invoice, newest first. */
export function useBillingHistory() {
  return useAsyncData(listInvoices);
}

/** One invoice, for the receipt view. */
export function useInvoice(id: string) {
  const load = useCallback(() => getInvoice(id), [id]);
  return useAsyncData(load);
}
