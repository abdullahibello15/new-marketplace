import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangleIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import i18n from '../../../../i18n';
import { formatNaira } from '../../../../utils/format';
import { CART_CHANGE_KIND, ORDER_ROUTES } from '../../constants';
import type { CartChange } from '../../types';

function describe(change: CartChange): string {
  switch (change.kind) {
    case CART_CHANGE_KIND.PriceChanged:
      return i18n.t(change.after > change.before ? 'jobs:order.changes.priceUp' : 'jobs:order.changes.priceDown', { before: formatNaira(change.before), after: formatNaira(change.after) });
    case CART_CHANGE_KIND.QuantityReduced:
      return i18n.t('jobs:order.changes.quantity', { before: change.before, after: change.after });
    case CART_CHANGE_KIND.OutOfStock:
      return i18n.t('jobs:order.changes.outOfStock');
    case CART_CHANGE_KIND.Unavailable:
      return i18n.t('jobs:order.changes.unavailable');
    case CART_CHANGE_KIND.VendorUnavailable:
      return i18n.t('jobs:order.changes.vendorUnavailable', { name: change.vendorName });
  }
}

interface CartChangesNoticeProps {
  changes: CartChange[];
  onAccept: () => void;
}

/** What changed since the customer added things to the cart. Nothing is ordered until they accept. */
export function CartChangesNotice({ changes, onAccept }: CartChangesNoticeProps) {
  const { t } = useTranslation('jobs');
  return (
    <section role="alert" aria-labelledby="cart-changes-heading" className="rounded-2xl border border-mustard bg-[#FBF3DC] p-4 lg:p-5">
      <h2 id="cart-changes-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        <AlertTriangleIcon className="h-5 w-5 text-mustard-dark" aria-hidden="true" />
        {t('order.changes.title')}
      </h2>
      <p className="mt-1 text-sm text-ink">{t('order.changes.text')}</p>
      <ul className="mt-3 space-y-2">
        {changes.map((c) =>
        <li key={`${c.kind}-${c.vendorId}-${c.productId}`} className="rounded-xl bg-white px-3 py-2 text-sm">
            <span className="font-bold text-ink">{c.name}</span>
            <span className="text-muted"> · {c.vendorName}</span>
            <span className="block text-ink">{describe(c)}</span>
          </li>
        )}
      </ul>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link to={ORDER_ROUTES.cart} className={buttonClasses({ variant: 'secondary' })}>
          {t('order.changes.back')}
        </Link>
        <Button onClick={onAccept}>{t('order.changes.accept')}</Button>
      </div>
    </section>);

}
