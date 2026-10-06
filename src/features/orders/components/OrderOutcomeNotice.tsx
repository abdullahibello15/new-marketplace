import { XCircleIcon } from 'lucide-react';
import { ORDER_SIDE_BRANCHES, ORDER_STATUS, ORDER_STATUS_META } from '../constants';
import type { Order } from '../types';

/** Why an order ended early (declined, cancelled, out of stock), with the reason given. Nothing otherwise. */
export function OrderOutcomeNotice({ order }: {order: Order;}) {
  if (!ORDER_SIDE_BRANCHES.includes(order.status)) return null;
  const last = order.history[order.history.length - 1];
  return (
    <section role="status" className="flex gap-3 rounded-2xl border border-clay/40 bg-clay-soft p-4 text-sm">
      <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-clay-dark" aria-hidden="true" />
      <div>
        <p className="font-bold text-ink">{ORDER_STATUS_META[order.status].label}</p>
        <p className="text-ink">{ORDER_STATUS_META[order.status].description}</p>
        {last.note && <p className="mt-1 italic text-muted">“{last.note}”</p>}
        {!order.stockReserved && order.history.some((h) => h.status === ORDER_STATUS.Confirmed) &&
        <p className="mt-1 text-muted">Items set aside for this order went back on sale.</p>
        }
      </div>
    </section>);

}
