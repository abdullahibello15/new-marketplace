import { SegmentedControl, type SegmentOption } from '../../../components/ui/SegmentedControl';
import { ORDER_STATUS_META, ORDER_STATUS_ORDER } from '../constants';
import type { OrderStatus, OrderStatusFilter as Filter } from '../types';

interface OrderStatusFilterProps {
  value: Filter;
  onChange: (next: Filter) => void;
  counts: Record<OrderStatus, number>;
  total: number;
}

/** All, then each status that has orders (plus the selected one, so it never vanishes). Customer and vendor lists. */
export function OrderStatusFilter({ value, onChange, counts, total }: OrderStatusFilterProps) {
  const options: SegmentOption<Filter>[] = [
  { id: 'all', label: 'All', count: total },
  ...ORDER_STATUS_ORDER.filter((s) => counts[s] > 0 || s === value).map((s) => ({ id: s, label: ORDER_STATUS_META[s].label, count: counts[s] }))];

  return <SegmentedControl label="Filter orders by status" options={options} value={value} onChange={onChange} />;
}
