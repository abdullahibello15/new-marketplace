import { useMemo, useState } from 'react';
import { normalizeSearch } from '../../../lib/sanitize';
import { ORDER_ACTOR } from '../constants';
import { orderActionHint } from '../utils/actionHints';
import { useOrderCounts } from './useOrderCounts';
import type { Order, OrderStatusFilter } from '../types';

/** Orders needing the vendor first (new, to prepare, to dispatch…), then the rest, most recently updated first. */
function byPriority(a: Order, b: Order): number {
  const rank = (o: Order) => orderActionHint(o, ORDER_ACTOR.Vendor) ? 0 : 1;
  return rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt);
}

/** Search by customer name or order number, and filter by status. */
export function useVendorOrderList(orders: Order[]) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const counts = useOrderCounts(orders);

  const results = useMemo(() => {
    const q = normalizeSearch(query).replace(/^#/, '');
    return orders.
    filter((o) => statusFilter === 'all' || o.status === statusFilter).
    filter((o) => !q || o.customerName.toLowerCase().includes(q) || o.id.includes(q)).
    sort(byPriority);
  }, [orders, query, statusFilter]);

  const hasFilters = Boolean(query.trim()) || statusFilter !== 'all';

  function clearFilters() {
    setQuery('');
    setStatusFilter('all');
  }

  return { query, setQuery, statusFilter, setStatusFilter, counts, results, hasFilters, clearFilters };
}
