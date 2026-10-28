import { useMemo } from 'react';
import { ORDER_STATUS_ORDER } from '../constants';
import type { Order, OrderStatus } from '../types';

/** How many orders are in each status, for the status filter. */
export function useOrderCounts(orders: Order[]): Record<OrderStatus, number> {
  return useMemo(() => {
    const byStatus = Object.fromEntries(ORDER_STATUS_ORDER.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const o of orders) byStatus[o.status] += 1;
    return byStatus;
  }, [orders]);
}
