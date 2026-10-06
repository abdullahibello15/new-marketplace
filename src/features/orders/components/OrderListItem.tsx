import { Link } from 'react-router-dom';
import { CalendarClockIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { Price } from '../../../components/ui/Price';
import { formatDay, formatTime } from '../../../utils/format';
import { FULFILMENT_METHOD, FULFILMENT_METHOD_LABELS } from '../constants';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { Order } from '../types';

interface OrderListItemProps {
  order: Order;
  to: string;
  /** The other party: the vendor (customer view) or the customer (vendor view). */
  title: string;
  actionHint?: string | null;
}

/** One order in a list. Same card in My Orders (customer) and Orders (vendor). */
export function OrderListItem({ order, to, title, actionHint }: OrderListItemProps) {
  const units = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const MethodIcon = order.method === FULFILMENT_METHOD.Delivery ? TruckIcon : StoreIcon;
  return (
    <Link
      to={to}
      className={`flex h-full flex-col rounded-2xl border bg-white p-4 transition-colors duration-150 hover:border-ink/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 lg:p-5 ${
      actionHint ? 'border-mustard ring-1 ring-mustard' : 'border-line'}`}>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink">{title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            <span className="font-semibold text-ink">#{order.id}</span> · {units} {units === 1 ? 'item' : 'items'}: {order.items.map((i) => i.name).join(', ')}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <CalendarClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Placed {formatDay(order.createdAt)}, {formatTime(order.createdAt)}
        </span>
        <Price amount={order.total} className="text-base font-bold text-ink" />
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <MethodIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {FULFILMENT_METHOD_LABELS[order.method]}
        {order.delivery && <span className="truncate"> · {order.delivery.placeLabel}</span>}
      </p>
      {actionHint && <p className="mt-3 rounded-lg bg-[#F7EBCB] px-3 py-1.5 text-sm font-bold text-mustard-dark">{actionHint}</p>}
    </Link>);

}
