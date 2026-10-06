import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ORDER_STATUS_ORDER } from '../constants';
import { listCustomerOrders } from '../services/orderService';
import { useOrderCounts } from './useOrderCounts';
import type { OrderStatus, OrderStatusFilter } from '../types';

const STATUS_PARAM = 'status';
const isStatus = (v: string | null): v is OrderStatus => ORDER_STATUS_ORDER.some((s) => s === v);

/** The customer's orders plus a status filter kept in the URL (?status=placed), like My Jobs. */
export function useMyOrders() {
  const { data, status, error, reload } = useAsyncData(listCustomerOrders);
  const [params, setParams] = useSearchParams();
  const raw = params.get(STATUS_PARAM);
  const filter: OrderStatusFilter = isStatus(raw) ? raw : 'all';
  const orders = useMemo(() => data ?? [], [data]);
  const counts = useOrderCounts(orders);
  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((o) => o.status === filter), [orders, filter]);

  function setFilter(next: OrderStatusFilter) {
    setParams(next === 'all' ? {} : { [STATUS_PARAM]: next }, { replace: true });
  }

  return { orders, visible, counts, filter, setFilter, status, error, reload };
}
