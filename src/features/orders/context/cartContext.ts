import { createContext } from 'react';
import type { Product, Vendor } from '../../../types/marketplace';
import type { AddToCartResult, CartItem, CartVendorGroup } from '../types';

export interface CartContextValue {
  items: CartItem[];
  groups: CartVendorGroup[];
  /** Total units across all vendors, for the nav badge. */
  count: number;
  total: number;
  /** Adds units of a product, never more than its stock. Returns a message when it can't. */
  add: (vendor: Pick<Vendor, 'id' | 'name' | 'unavailable'>, product: Product, quantity?: number) => AddToCartResult;
  /** Sets a line's quantity, clamped to 1…its stock. */
  setQuantity: (vendorId: string, productId: string, quantity: number) => void;
  remove: (vendorId: string, productId: string) => void;
  /** Replaces the cart with checked lines (after the customer accepts price or stock changes). */
  replaceAll: (items: CartItem[]) => void;
  /** Drops these vendors' lines, e.g. once their orders are placed. */
  removeVendors: (vendorIds: string[]) => void;
  quantityOf: (vendorId: string, productId: string) => number;
}

export const CartContext = createContext<CartContextValue | null>(null);
