import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { Price } from '../../../components/ui/Price';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { PRODUCT_ROUTES } from '../../discovery/constants';
import type { LoginRedirectState } from '../../auth/components/guards';
import { ORDER_ROUTES } from '../constants';
import { CartVendorGroup } from '../components/cart/CartVendorGroup';
import { SeparateFulfilmentNote } from '../components/SeparateFulfilmentNote';
import { useCart } from '../hooks/useCart';
import type { CartItem } from '../types';

/** After signing in or up from the cart, people come straight back to checkout. */
const TO_CHECKOUT: LoginRedirectState = { from: ORDER_ROUTES.checkout };

/**
 * The multi-vendor cart, grouped by vendor, with an overall total and a link to checkout. Open to guests;
 * for them the checkout button leads to login (or signup) and back to checkout, with the cart kept.
 */
export function CartSection() {
  const { t } = useTranslation('jobs');
  const { user } = useAuth();
  const cart = useCart();
  const [removing, setRemoving] = useState<CartItem | null>(null);
  const vendorCount = cart.groups.length;

  return (
    <>
      <PageHeader
        title={t('order.cart.title')}
        subtitle={
        cart.count ?
        t('order.cart.subtitle', { items: t('order.items', { count: cart.count }), vendors: t('order.cart.vendors', { count: vendorCount }) }) :
        t('order.cart.subtitleEmpty')
        } />

      <PageContainer>
        {cart.items.length === 0 ?
        <EmptyState
          icon={ShoppingCartIcon}
          title={t('order.cart.emptyTitle')}
          description={t('order.cart.emptyText')}
          action={
          <Link to={PRODUCT_ROUTES.list} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                {t('order.cart.browseProducts')}
              </Link>
          } /> :


        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              {cart.groups.map((group) =>
            <CartVendorGroup
              key={group.vendorId}
              group={group}
              onQuantityChange={(item, q) => cart.setQuantity(item.vendorId, item.productId, q)}
              onRemove={setRemoving} />

            )}
            </div>
            <aside aria-labelledby="cart-summary-heading" className="space-y-4 lg:sticky lg:top-32 lg:self-start">
              <section className="rounded-2xl border border-line bg-white p-4 lg:p-5">
                <h2 id="cart-summary-heading" className="text-base font-bold text-ink">
                  {t('order.cart.summary')}
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  {cart.groups.map((g) =>
                <div key={g.vendorId} className="flex justify-between gap-3">
                      <dt className="min-w-0 truncate text-muted">{g.vendorName}</dt>
                      <dd>
                        <Price amount={g.subtotal} className="font-semibold text-ink" />
                      </dd>
                    </div>
                )}
                  <div className="flex justify-between gap-3 border-t border-line pt-2">
                    <dt className="font-bold text-ink">{t('order.cart.itemsTotal')}</dt>
                    <dd>
                      <Price amount={cart.total} className="text-lg font-extrabold text-ink" />
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted">{t('order.cart.feesNote')}</p>
                {user ?
              <Link to={ORDER_ROUTES.checkout} className={`${buttonClasses({ fullWidth: true })} mt-4`}>
                    {t('order.cart.checkout')}
                  </Link> :

              <>
                    <Link to={AUTH_ROUTES.login} state={TO_CHECKOUT} className={`${buttonClasses({ fullWidth: true })} mt-4`}>
                      {t('order.cart.signInToCheckout')}
                    </Link>
                    <Link to={AUTH_ROUTES.signupFor(ROLE.Customer)} state={TO_CHECKOUT} className={`${buttonClasses({ variant: 'secondary', fullWidth: true })} mt-2`}>
                      {t('order.cart.newCustomer')}
                    </Link>
                    <p className="mt-3 text-xs text-muted">{t('order.cart.guestNote')}</p>
                  </>
              }
              </section>
              <SeparateFulfilmentNote vendorCount={vendorCount} />
            </aside>
          </div>
        }
      </PageContainer>

      <ConfirmDialog
        open={removing !== null}
        title={t('order.cart.removeTitle')}
        description={removing ? t('order.cart.removeText', { name: removing.name, vendor: removing.vendorName }) : undefined}
        confirmLabel={t('order.cart.remove')}
        cancelLabel={t('order.cart.keep')}
        destructive
        onConfirm={() => {
          if (removing) cart.remove(removing.vendorId, removing.productId);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)} />

    </>);

}
