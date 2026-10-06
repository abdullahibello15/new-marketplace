import { format } from 'date-fns';
import { ORDER_ACTOR, ORDER_ACTOR_LABELS } from '../constants';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { Order, OrderActor, OrderParty } from '../types';

interface OrderStatusHistoryProps {
  order: Pick<Order, 'history' | 'customerName' | 'vendorName'>;
  /** Whose screen this is, so their own changes read "You". */
  viewer: OrderParty;
}

/** Audit trail: every status change, who made it, when and why, newest first. */
export function OrderStatusHistory({ order, viewer }: OrderStatusHistoryProps) {
  const who = (by: OrderActor) =>
  by === viewer ? 'You' : by === ORDER_ACTOR.Customer ? order.customerName : by === ORDER_ACTOR.Vendor ? order.vendorName : ORDER_ACTOR_LABELS.system;

  return (
    <section aria-labelledby="order-history-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="order-history-heading" className="mb-3 text-base font-bold text-ink">
        Activity
      </h2>
      <ol className="space-y-3" aria-label="Status history">
        {[...order.history].reverse().map((h, i) =>
        <li key={`${h.status}-${h.at}-${i}`} className="flex items-start gap-3">
            <OrderStatusBadge status={h.status} className="mt-0.5" />
            <div className="min-w-0 text-sm">
              <p className="text-ink">
                <span className="font-semibold">{who(h.by)}</span>
                <span className="text-muted"> · </span>
                <time dateTime={h.at} className="text-muted">
                  {format(new Date(h.at), 'd MMM yyyy, h:mm a')}
                </time>
              </p>
              {h.note && <p className="mt-0.5 italic text-muted">“{h.note}”</p>}
            </div>
          </li>
        )}
      </ol>
    </section>);

}
