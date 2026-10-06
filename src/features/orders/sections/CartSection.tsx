import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { Price } from '../../../components/ui/Price';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { ORDER_ROUTES } from '../constants';
import { CartVendorGroup } from '../components/cart/CartVendorGroup';
import { SeparateFulfilmentNote } from '../components/SeparateFulfilmentNote';
import { useCart } from '../hooks/useCart';
import type { CartItem } from '../types';

/** The multi-vendor cart, grouped by vendor, with an overall total and a link to checkout. */
export function CartSection() {
  const cart = useCart();
  const [removing, setRemoving] = useState<CartItem | null>(null);
  const vendorCount = cart.groups.length;

  return (
    <>
      <PageHeader
        title="Cart"
        subtitle={
        cart.count ?
        `${cart.count} ${cart.count === 1 ? 'item' : 'items'} from ${vendorCount} ${vendorCount === 1 ? 'vendor' : 'vendors'}` :
        'Products you add from vendor shops'
        } />

      <PageContainer>
        {cart.items.length === 0 ?
        <EmptyState
          icon={ShoppingCartIcon}
          title="Your cart is empty"
          description="Open a vendor’s profile and tap Add to cart on any product in their shop."
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Browse vendors
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
            <aside aria-labelledby="cart-summary-heading" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-2xl border border-line bg-white p-4 lg:p-5">
                <h2 id="cart-summary-heading" className="text-base font-bold text-ink">
                  Summary
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
                    <dt className="font-bold text-ink">Items total</dt>
                    <dd>
                      <Price amount={cart.total} className="text-lg font-extrabold text-ink" />
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted">Delivery fees, if any, are added at checkout when you choose pickup or delivery.</p>
                <Link to={ORDER_ROUTES.checkout} className={`${buttonClasses({ fullWidth: true })} mt-4`}>
                  Go to checkout
                </Link>
              </section>
              <SeparateFulfilmentNote vendorCount={vendorCount} />
            </aside>
          </div>
        }
      </PageContainer>

      <ConfirmDialog
        open={removing !== null}
        title="Remove from cart?"
        description={removing ? `${removing.name} from ${removing.vendorName} will be removed from your cart.` : undefined}
        confirmLabel="Remove"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => {
          if (removing) cart.remove(removing.vendorId, removing.productId);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)} />

    </>);

}
