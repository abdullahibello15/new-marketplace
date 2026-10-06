import { Link } from 'react-router-dom';
import { StoreIcon, Trash2Icon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import { vendorProfilePath } from '../../../public-profile/constants';
import { lineTotal } from '../../utils/cart';
import { ItemThumb } from '../ItemThumb';
import { QuantityStepper } from './QuantityStepper';
import type { CartItem, CartVendorGroup as Group } from '../../types';

interface CartVendorGroupProps {
  group: Group;
  onQuantityChange: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
}

/** One vendor's part of the cart: their items, quantity steppers, remove, and a subtotal. */
export function CartVendorGroup({ group, onQuantityChange, onRemove }: CartVendorGroupProps) {
  const headingId = `cart-vendor-${group.vendorId}`;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 lg:px-5">
        <h2 id={headingId} className="flex min-w-0 items-center gap-2 text-base font-bold text-ink">
          <StoreIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <Link to={vendorProfilePath(group.vendorId)} className="truncate rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
            {group.vendorName}
          </Link>
        </h2>
        <span className="shrink-0 text-sm text-muted">
          {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {group.items.map((item) =>
        <li key={item.productId} className="flex gap-3 px-4 py-4 lg:px-5">
            <ItemThumb src={item.image} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink">{item.name}</h3>
                  <p className="text-sm text-muted">
                    <Price amount={item.unitPrice} /> each
                  </p>
                </div>
                <Price amount={lineTotal(item)} className="shrink-0 font-bold text-ink" />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <QuantityStepper value={item.quantity} max={item.maxQuantity} onChange={(q) => onQuantityChange(item, q)} itemName={item.name} />
                <button
                type="button"
                onClick={() => onRemove(item)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-sand hover:text-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                  <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                  Remove<span className="sr-only"> {item.name}</span>
                </button>
              </div>
              {item.quantity >= item.maxQuantity &&
            <p className="mt-1 text-xs font-semibold text-mustard-dark">Only {item.maxQuantity} in stock.</p>
            }
            </div>
          </li>
        )}
      </ul>
      <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm lg:px-5">
        <span className="font-semibold text-muted">Subtotal from {group.vendorName}</span>
        <Price amount={group.subtotal} className="text-base font-extrabold text-ink" />
      </footer>
    </section>);

}
