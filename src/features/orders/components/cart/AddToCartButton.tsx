import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ORDER_ROUTES } from '../../constants';
import { useAddToCart } from '../../hooks/useAddToCart';
import type { Product, Vendor } from '../../../../types/marketplace';

interface AddToCartButtonProps {
  vendor: Pick<Vendor, 'id' | 'name' | 'unavailable'>;
  product: Product;
}

/** "Add to cart" under a product. Never adds more than the vendor has in stock, and says so. */
export function AddToCartButton({ vendor, product }: AddToCartButtonProps) {
  const messageId = useId();
  const a = useAddToCart(vendor, product);

  if (a.soldOut) {
    return (
      <Button variant="secondary" size="sm" fullWidth disabled>
        Out of stock
      </Button>);

  }

  return (
    <div>
      <Button
        variant={a.inCart ? 'outline' : 'primary'}
        size="sm"
        fullWidth
        icon={ShoppingCartIcon}
        onClick={a.add}
        disabled={Boolean(a.blockedReason) || a.atMax}
        aria-describedby={a.message || a.blockedReason ? messageId : undefined}
        aria-label={`Add ${product.name} to cart`}>

        {a.inCart ? 'Add another' : 'Add to cart'}
      </Button>
      {a.inCart > 0 &&
      <Link
        to={ORDER_ROUTES.cart}
        className="mt-1.5 block rounded text-center text-xs font-bold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          {a.inCart} in your cart · View cart
        </Link>
      }
      <p id={messageId} aria-live="polite" className="mt-1.5 text-xs font-semibold text-clay-dark empty:hidden">
        {a.blockedReason ?? a.message}
      </p>
    </div>);

}
