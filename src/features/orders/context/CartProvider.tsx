import React, { useCallback, useMemo } from 'react';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { CART_STORAGE_KEY } from '../constants';
import { cartTotal, cartUnitCount, groupCart, parseStoredCart, sameLine } from '../utils/cart';
import { CartContext, type CartContextValue } from './cartContext';
import type { CartItem } from '../types';

const EMPTY: CartItem[] = [];

/**
 * The customer's multi-vendor cart, kept in localStorage so it survives reloads. Quantities are
 * capped by the stock seen when adding; checkout re-checks prices and stock against the live shop.
 */
export function CartProvider({ children }: {children: React.ReactNode;}) {
  const [items, setItems] = usePersistentState<CartItem[]>(CART_STORAGE_KEY, EMPTY, parseStoredCart);

  const quantityOf = useCallback(
    (vendorId: string, productId: string) => items.find((i) => sameLine(i, { vendorId, productId }))?.quantity ?? 0,
    [items]
  );

  const add = useCallback<CartContextValue['add']>(
    (vendor, product, quantity = 1) => {
      if (vendor.unavailable) return { ok: false, message: `${vendor.name} isn’t taking orders right now.` };
      if (!product.available || product.stock <= 0) return { ok: false, message: `${product.name} is out of stock.` };
      const key = { vendorId: vendor.id, productId: product.id };
      const existing = items.find((i) => sameLine(i, key))?.quantity ?? 0;
      if (existing + quantity > product.stock) {
        return {
          ok: false,
          message:
          existing >= product.stock ?
          `You already have all ${product.stock} ${product.name} in your cart. The vendor has no more in stock.` :
          `Only ${product.stock} in stock. You can add ${product.stock - existing} more.`
        };
      }
      const next = existing + quantity;
      setItems((prev) => {
        const line: CartItem = {
          vendorId: vendor.id,
          vendorName: vendor.name,
          productId: product.id,
          name: product.name,
          image: product.images[0] ?? null,
          // The price and stock the customer sees now; checkout compares them with the live shop.
          unitPrice: product.price,
          quantity: next,
          maxQuantity: product.stock,
          addedAt: prev.find((i) => sameLine(i, key))?.addedAt ?? new Date().toISOString()
        };
        return prev.some((i) => sameLine(i, key)) ? prev.map((i) => sameLine(i, key) ? line : i) : [...prev, line];
      });
      return { ok: true, quantity: next };
    },
    [items, setItems]
  );

  const setQuantity = useCallback(
    (vendorId: string, productId: string, quantity: number) =>
    setItems((prev) =>
    prev.map((i) => sameLine(i, { vendorId, productId }) ? { ...i, quantity: Math.min(i.maxQuantity, Math.max(1, Math.round(quantity))) } : i)
    ),
    [setItems]
  );

  const remove = useCallback(
    (vendorId: string, productId: string) => setItems((prev) => prev.filter((i) => !sameLine(i, { vendorId, productId }))),
    [setItems]
  );

  const replaceAll = useCallback((next: CartItem[]) => setItems(next), [setItems]);

  const removeVendors = useCallback(
    (vendorIds: string[]) => setItems((prev) => prev.filter((i) => !vendorIds.includes(i.vendorId))),
    [setItems]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      groups: groupCart(items),
      count: cartUnitCount(items),
      total: cartTotal(items),
      add,
      setQuantity,
      remove,
      replaceAll,
      removeVendors,
      quantityOf
    }),
    [items, add, setQuantity, remove, replaceAll, removeVendors, quantityOf]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
