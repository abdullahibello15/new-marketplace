import { Badge } from '../../../components/ui/Badge';
import { Price } from '../../../components/ui/Price';
import { FULFILMENT_METHOD } from '../constants';
import { ItemThumb } from './ItemThumb';
import type { Order } from '../types';

/** The order's lines and totals. Lines the vendor marked out of stock are struck through and not charged. */
export function OrderItemsList({ order }: {order: Order;}) {
  return (
    <section aria-labelledby="order-items-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="order-items-heading" className="text-base font-bold text-ink">
        Items
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {order.items.map((i) =>
        <li key={i.productId} className="flex items-center gap-3 py-3">
            <ItemThumb src={i.image} className={`h-12 w-12 ${i.outOfStock ? 'opacity-50' : ''}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${i.outOfStock ? 'text-muted line-through' : 'text-ink'}`}>{i.name}</p>
              <p className="text-sm text-muted">
                {i.quantity} × <Price amount={i.unitPrice} />
              </p>
              {i.outOfStock &&
            <Badge tone="danger" className="mt-1">
                  Out of stock · not charged
                </Badge>
            }
            </div>
            <Price amount={i.unitPrice * i.quantity} className={`shrink-0 font-bold ${i.outOfStock ? 'text-muted line-through' : 'text-ink'}`} />
          </li>
        )}
      </ul>
      <dl className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Items</dt>
          <dd>
            <Price amount={order.itemsTotal} className="text-ink" />
          </dd>
        </div>
        {order.method === FULFILMENT_METHOD.Delivery &&
        <div className="flex justify-between gap-3">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-ink">{order.deliveryFee ? <Price amount={order.deliveryFee} /> : 'Free'}</dd>
          </div>
        }
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-ink">Total</dt>
          <dd>
            <Price amount={order.total} className="text-lg font-extrabold text-ink" />
          </dd>
        </div>
      </dl>
    </section>);

}
