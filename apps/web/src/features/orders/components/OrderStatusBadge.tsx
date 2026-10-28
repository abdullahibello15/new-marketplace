import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { orderStatusLabel } from '../../../i18n/labels';
import { ORDER_STATUS_META } from '../constants';
import type { OrderStatus } from '../types';

/** Order status pill: same look as the job badge. Used by the customer app and the vendor dashboard. */
export function OrderStatusBadge({ status, className = '' }: {status: OrderStatus;className?: string;}) {
  useTranslation();
  const meta = ORDER_STATUS_META[status];
  return <StatusBadge meta={{ ...meta, label: orderStatusLabel(status, meta.label) }} className={className} />;
}
