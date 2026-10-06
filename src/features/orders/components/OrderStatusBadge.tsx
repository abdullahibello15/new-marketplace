import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ORDER_STATUS_META } from '../constants';
import type { OrderStatus } from '../types';

/** Order status pill: same look as the job badge. Used by the customer app and the vendor dashboard. */
export function OrderStatusBadge({ status, className = '' }: {status: OrderStatus;className?: string;}) {
  return <StatusBadge meta={ORDER_STATUS_META[status]} className={className} />;
}
