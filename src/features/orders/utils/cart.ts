import type { CartItem, CartVendorGroup } from '../types';

export const lineTotal = (item: Pick<CartItem, 'unitPrice' | 'quantity'>) => item.unitPrice * item.quantity;

export const sameLine = (a: Pick<CartItem, 'vendorId' | 'productId'>, b: Pick<CartItem, 'vendorId' | 'productId'>) =>
a.vendorId === b.vendorId && a.productId === b.productId;

/** Cart lines grouped by vendor, in the order each vendor was first added. */
export function groupCart(items: CartItem[]): CartVendorGroup[] {
  const groups = new Map<string, CartVendorGroup>();
  for (const item of items) {
    const group = groups.get(item.vendorId) ?? { vendorId: item.vendorId, vendorName: item.vendorName, items: [], itemCount: 0, subtotal: 0 };
    group.items.push(item);
    group.itemCount += item.quantity;
    group.subtotal += lineTotal(item);
    groups.set(item.vendorId, group);
  }
  return [...groups.values()];
}

export const cartUnitCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + lineTotal(i), 0);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

function parseItem(raw: unknown): CartItem | null {
  if (!isRecord(raw)) return null;
  const { vendorId, vendorName, productId, name, image, unitPrice, quantity, maxQuantity, addedAt } = raw;
  if (!isText(vendorId) || !isText(vendorName) || !isText(productId) || !isText(name) || !isText(addedAt)) return null;
  if (!isCount(unitPrice) || !isCount(quantity) || !isCount(maxQuantity)) return null;
  if (image !== null && typeof image !== 'string') return null;
  return { vendorId, vendorName, productId, name, image, unitPrice, quantity: Math.min(quantity, maxQuantity), maxQuantity, addedAt };
}

/**
 * Validates a cart read back from localStorage (it may be old, hand-edited or corrupt). Bad lines are
 * dropped rather than failing the whole cart; prices are checked again at checkout anyway.
 */
export function parseStoredCart(raw: unknown): CartItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: CartItem[] = [];
  for (const entry of raw) {
    const item = parseItem(entry);
    if (item && !items.some((i) => sameLine(i, item))) items.push(item);
  }
  return items;
}
