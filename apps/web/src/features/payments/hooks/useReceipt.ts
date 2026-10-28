import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getReceiptDocument } from '../services/transactionService';
import type { ReceiptViewer } from '../types';

/** The receipt for one payment reference: the customer's copy, or the vendor's (with commission). */
export function useReceipt(reference: string, viewer: ReceiptViewer = 'customer') {
  const load = useCallback(() => getReceiptDocument(reference, viewer), [reference, viewer]);
  return useAsyncData(load);
}
