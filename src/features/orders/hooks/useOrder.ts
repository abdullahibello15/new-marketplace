import { useCallback, useEffect } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ApiError } from '../../../services/mockApi';
import { ORDER_POLL_INTERVAL_MS } from '../constants';
import { getOrder } from '../services/orderService';
import type { Order } from '../types';

/**
 * One order. A 404 becomes `notFound`; `replace` swaps in the order returned by an action. While the
 * tab is visible it refetches every ORDER_POLL_INTERVAL_MS so the vendor's progress shows up.
 */
export function useOrder(orderId: string) {
  const load = useCallback(
    () =>
    getOrder(orderId).catch((e: unknown): Order | null => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    [orderId]
  );
  const { data, status, error, reload, setData } = useAsyncData(load);
  const replace = useCallback((order: Order) => setData(() => order), [setData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, ORDER_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  return { order: data, notFound: status === 'success' && data === null, status, error, reload, replace };
}
