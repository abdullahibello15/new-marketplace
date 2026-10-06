import { MapPinIcon, PhoneIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { FULFILMENT_METHOD } from '../constants';
import type { Order } from '../types';

/** Pickup point and instructions, or the delivery address and phone. Same card on both sides. */
export function OrderFulfilmentDetails({ order }: {order: Order;}) {
  const isDelivery = order.method === FULFILMENT_METHOD.Delivery;
  return (
    <section aria-labelledby="order-fulfilment-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="order-fulfilment-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        {isDelivery ? <TruckIcon className="h-4 w-4 text-muted" aria-hidden="true" /> : <StoreIcon className="h-4 w-4 text-muted" aria-hidden="true" />}
        {isDelivery ? 'Delivery' : 'Pickup'}
      </h2>
      {isDelivery && order.delivery &&
      <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt>
              <MapPinIcon className="mt-0.5 h-4 w-4 text-muted" aria-hidden="true" />
              <span className="sr-only">Address</span>
            </dt>
            <dd className="text-ink">
              {order.delivery.landmark}
              <span className="block text-muted">
                {order.delivery.placeLabel} · {order.delivery.lga} LGA
              </span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt>
              <PhoneIcon className="mt-0.5 h-4 w-4 text-muted" aria-hidden="true" />
              <span className="sr-only">Phone</span>
            </dt>
            <dd>
              <a href={`tel:${order.delivery.phone.replace(/\s/g, '')}`} className="rounded font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                {order.delivery.phone}
              </a>
            </dd>
          </div>
        </dl>
      }
      {!isDelivery && order.pickup &&
      <div className="mt-3 flex gap-2 text-sm">
          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink">{order.pickup.address}</p>
            {order.pickup.instructions && <p className="text-muted">{order.pickup.instructions}</p>}
          </div>
        </div>
      }
    </section>);

}
