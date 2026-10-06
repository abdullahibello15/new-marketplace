import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
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
  const blockedReason = vendor.unavailable ? `${vendor.name} isn’t taking orders right now.` : null;

  function add() {
    const result = cart.add(vendor, product);
    if (result.ok) {
      setMessage(null);
      toast.success(`Added ${product.name} to your cart (${result.quantity}).`);
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
    message: message ?? (atMax ? `All ${product.stock} in stock are in your cart.` : null)
  };
}
