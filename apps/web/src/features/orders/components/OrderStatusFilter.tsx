import { useTranslation } from 'react-i18next';
import { SegmentedControl, type SegmentOption } from '../../../components/ui/SegmentedControl';
import { orderStatusLabel } from '../../../i18n/labels';
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
  const { t } = useTranslation('jobs');
  const options: SegmentOption<Filter>[] = [
  { id: 'all', label: t('filter.all'), count: total },
  ...ORDER_STATUS_ORDER.filter((s) => counts[s] > 0 || s === value).map((s) => ({ id: s, label: orderStatusLabel(s, ORDER_STATUS_META[s].label), count: counts[s] }))];

  return <SegmentedControl label={t('order.filterLabel')} options={options} value={value} onChange={onChange} />;
}
