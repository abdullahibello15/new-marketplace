import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { useToast } from '../../../hooks/useToast';
import i18n from '../../../i18n';
import { ROLE } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { CART_OWNER_STORAGE_KEY, CART_STORAGE_KEY } from '../constants';
import { getSavedCart, mergeGuestCart, saveCart } from '../services/cartService';
import { cartTotal, cartUnitCount, groupCart, mergeCarts, parseStoredCart, sameLine } from '../utils/cart';
import { CartContext, type CartContextValue } from './cartContext';
import type { CartItem } from '../types';

const EMPTY: CartItem[] = [];
/** Wait for changes to settle before saving the cart to the account. */
const SAVE_DEBOUNCE_MS = 600;

function cartOwner(): string | null {
  try {
    return window.localStorage.getItem(CART_OWNER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCartOwner(userId: string) {
  try {
    window.localStorage.setItem(CART_OWNER_STORAGE_KEY, userId);
  } catch {
    // Storage blocked: the cart itself isn't kept either, so after a reload it starts empty and the
    // merge simply loads the saved cart (nothing is counted twice).
  }
}

/**
 * The multi-vendor cart, kept in localStorage so it survives reloads. Guests have one too: browsing and
 * adding to the cart need no account. Quantities are capped by the stock seen when adding; checkout
 * re-checks prices and stock against the live shop.
 *
 * Signing in as a customer joins the guest cart with the one saved to their account (mergeGuestCart),
 * then every change is saved back. A cart that already belongs to that account (a reload, a restored
 * session) isn't merged again, which would add its quantities twice: the saved copy is loaded instead.
 * Signing out clears this device's copy and its owner (shared phones); the saved cart comes back on the
 * next sign-in.
 */
export function CartProvider({ children }: {children: React.ReactNode;}) {
  const [items, setItems] = usePersistentState<CartItem[]>(CART_STORAGE_KEY, EMPTY, parseStoredCart);
  const { status, user } = useAuth();
  const toast = useToast();
  const customerId = status === 'signed_in' && user?.roles.includes(ROLE.Customer) ? user.id : null;
  // The account this device's cart has been merged into. Saving waits for it, so a failed merge can
  // never overwrite the saved cart with only the guest's lines.
  const [mergedFor, setMergedFor] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  // Derived, so it's already true on the first render after signing in (checkout waits for the merge).
  const syncing = customerId !== null && mergedFor !== customerId && failedFor !== customerId;
  const latest = useRef(items);
  latest.current = items;

  useEffect(() => {
    if (!customerId) {
      setMergedFor(null);
      setFailedFor(null);
      return;
    }
    let cancelled = false;
    const guest = latest.current;
    const alreadyTheirs = cartOwner() === customerId;
    (alreadyTheirs ? getSavedCart() : mergeGuestCart(guest)).then(
      (merged) => {
        if (cancelled) return;
        // Lines added while the request was in flight are joined on top, so nothing is lost.
        setItems((now) => now === guest ? merged : mergeCarts(merged, now.filter((i) => !guest.some((g) => sameLine(g, i)))));
        setCartOwner(customerId);
        setMergedFor(customerId);
        if (!alreadyTheirs && guest.length > 0 && merged.some((m) => !guest.some((g) => sameLine(g, m)))) toast.success(i18n.t('jobs:order.cart.merged'));
      },
      () => {
        // Keep this device's cart; it's saved once a later sign-in merges successfully.
        if (!cancelled) setFailedFor(customerId);
      }
    );
    return () => {
      cancelled = true;
    };
    // Once per account signed in to (not on every cart change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const toSave = useDebouncedValue(items, SAVE_DEBOUNCE_MS);
  useEffect(() => {
    // Only once changes have settled (toSave caught up with the cart): right after the merge the debounced
    // value is still the pre-merge cart, which must not overwrite the merged one on the server.
    if (!customerId || mergedFor !== customerId || toSave !== items) return;
    // Best effort: the cart is still on this device, and the next change tries again.
    saveCart(toSave).catch(() => undefined);
  }, [toSave, items, customerId, mergedFor]);

  const quantityOf = useCallback(
    (vendorId: string, productId: string) => items.find((i) => sameLine(i, { vendorId, productId }))?.quantity ?? 0,
    [items]
  );

  const add = useCallback<CartContextValue['add']>(
    (vendor, product, quantity = 1) => {
      if (vendor.unavailable) return { ok: false, message: i18n.t('jobs:order.cart.vendorUnavailable', { name: vendor.name }) };
      if (!product.available || product.stock <= 0) return { ok: false, message: i18n.t('jobs:order.cart.productOutOfStock', { name: product.name }) };
      const key = { vendorId: vendor.id, productId: product.id };
      const existing = items.find((i) => sameLine(i, key))?.quantity ?? 0;
      if (existing + quantity > product.stock) {
        return {
          ok: false,
          message:
          existing >= product.stock ?
          i18n.t('jobs:order.cart.haveAll', { stock: product.stock, name: product.name }) :
          i18n.t('jobs:order.cart.onlyCanAdd', { stock: product.stock, more: product.stock - existing })
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
      quantityOf,
      syncing
    }),
    [items, add, setQuantity, remove, replaceAll, removeVendors, quantityOf, syncing]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
