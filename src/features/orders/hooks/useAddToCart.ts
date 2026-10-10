import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import i18n from '../../../i18n';
import { useCart } from './useCart';
import type { Product, Vendor } from '../../../types/marketplace';

/** Add-to-cart state for one product: how many are in the cart, whether more can be added, and why not. */
export function useAddToCart(vendor: Pick<Vendor, 'id' | 'name' | 'unavailable'>, product: Product) {
  const cart = useCart();
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const inCart = cart.quantityOf(vendor.id, product.id);
  const soldOut = !product.available || product.stock <= 0;
  const atMax = !soldOut && inCart >= product.stock;
  const blockedReason = vendor.unavailable ? i18n.t('jobs:order.cart.vendorUnavailable', { name: vendor.name }) : null;

  function add() {
    const result = cart.add(vendor, product);
    if (result.ok) {
      setMessage(null);
      toast.success(i18n.t('jobs:order.cart.added', { name: product.name, count: result.quantity }));
    } else {
      // Stays on screen next to the button, not only in a toast, so it's easy to see why.
      setMessage(result.message);
    }
  }

  return {
    inCart,
    soldOut,
    atMax,
    blockedReason,
    add,
    message: message ?? (atMax ? i18n.t('jobs:order.cart.allInCart', { stock: product.stock }) : null)
  };
}
