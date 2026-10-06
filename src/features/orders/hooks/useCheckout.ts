import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { listPlaces } from '../../discovery/services/placeService';
import { checkCart } from '../services/orderService';
import { useCart } from './useCart';
import type { CheckoutResult } from '../types';

/**
 * Checkout page state. Checks the cart against the live shop when the page opens (and again on
 * request), so price or stock changes since adding are shown before anything is ordered.
 */
export function useCheckout() {
  const cart = useCart();
  // The lines being checked out. Fixed while on the page so the check and the form describe the same cart.
  const [lines, setLines] = useState(cart.items);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const load = useCallback(() => checkCart(lines), [lines]);
  const check = useAsyncData(load);
  const places = useAsyncData(listPlaces);

  /** The customer accepted the changes: the cart takes the live prices and stock, then we check again. */
  function acceptChanges() {
    if (!check.data) return;
    cart.replaceAll(check.data.items);
    setLines(check.data.items);
  }

  /** Orders are placed: those vendors leave the cart and the page shows the confirmation. */
  function complete(placed: CheckoutResult) {
    cart.removeVendors(placed.orders.map((o) => o.vendorId));
    setResult(placed);
  }

  return { lines, check, places, acceptChanges, recheck: check.reload, complete, result };
}
