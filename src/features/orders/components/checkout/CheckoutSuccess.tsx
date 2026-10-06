import { Link } from 'react-router-dom';
import { CheckCircle2Icon, ChevronRightIcon } from 'lucide-react';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { Price } from '../../../../components/ui/Price';
import { FULFILMENT_METHOD_LABELS, ORDER_ROUTES } from '../../constants';
import { PAYMENT_ROUTES, PAYMENT_SUBJECT } from '../../../payments/constants';
import { OrderStatusBadge } from '../OrderStatusBadge';
import type { CheckoutResult } from '../../types';

/** After checkout: the shared reference and one link per vendor order. */
export function CheckoutSuccess({ result }: {result: CheckoutResult;}) {
  const many = result.orders.length > 1;
  return (
    <section aria-labelledby="checkout-done-heading" className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-5 text-center lg:p-6">
      <CheckCircle2Icon className="mx-auto h-10 w-10 text-pine" aria-hidden="true" />
      <h2 id="checkout-done-heading" className="mt-3 text-xl font-extrabold text-ink">
        {many ? `${result.orders.length} orders placed` : 'Order placed'}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Checkout reference <span className="font-bold text-ink">{result.checkoutRef}</span>.{' '}
        {many ? 'Each vendor confirms their own order, and you can follow each one separately.' : 'The vendor will confirm your order soon.'}
      </p>
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line text-left">
        {result.orders.map((o) =>
        <li key={o.id}>
            <Link
            to={ORDER_ROUTES.order(o.id)}
            className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine/40">

              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">{o.vendorName}</span>
                <span className="block text-sm text-muted">
                  Order #{o.id} · {FULFILMENT_METHOD_LABELS[o.method]} · <Price amount={o.total} />
                </span>
              </span>
              <OrderStatusBadge status={o.status} />
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </Link>
          </li>
        )}
      </ul>
      <div className="mt-5 text-left">
        <h3 className="text-sm font-bold text-ink">Next: pay {many ? 'each vendor' : 'for your order'}</h3>
        <p className="text-sm text-muted">Each order is paid separately, by card, transfer or USSD (or cash at pickup, where the vendor allows it).</p>
        <ul className="mt-2 space-y-2">
          {result.orders.map((o) =>
          <li key={o.id}>
              <Link to={PAYMENT_ROUTES.checkout(PAYMENT_SUBJECT.Order, o.id)} className={buttonClasses({ fullWidth: true })}>
                Pay {o.vendorName} <Price amount={o.total} />
              </Link>
            </li>
          )}
        </ul>
      </div>
      <Link to={ORDER_ROUTES.myOrders} className={`${buttonClasses({ variant: 'secondary' })} mt-5`}>
        Go to My Orders
      </Link>
    </section>);

}
