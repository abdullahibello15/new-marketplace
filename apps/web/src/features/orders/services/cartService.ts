import i18n from '../../../i18n';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { currentCustomerId } from '../../auth/session';
import { CART_MAX_LINES, mergeCarts, parseStoredCart, sameLine } from '../utils/cart';
import type { CartItem } from '../types';

/*
 * ===========================================================================
 * The cart saved to a customer's account (mock server side). A guest's cart lives only in their browser
 * (CartProvider); when they sign in it's merged into this one, so it follows them to other devices and
 * comes back after signing out. Every call needs a signed-in customer: a guest gets 401, like the real
 * API (GET/PUT /v1/cart, POST /v1/cart/merge).
 * ===========================================================================
 */

const DB_KEY = 'gwani:mock-cart-db:v1';
const SAVE_LATENCY_MS = 200;

/** Demo: Aisha already has something saved, so signing in from a guest cart shows the merge. */
const SEED: Record<string, CartItem[]> = {
  'cust-aisha': [
  {
    vendorId: 'hauwa-tailoring',
    vendorName: 'Hauwa Tailoring & Ankara',
    productId: 'p13',
    name: 'Gele head tie',
    image: '/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg',
    unitPrice: 4500,
    quantity: 1,
    maxQuantity: 25,
    addedAt: '2026-10-01T09:00:00.000Z'
  }]

};

function load(): Map<string, CartItem[]> {
  const map = new Map(Object.entries(SEED));
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) for (const [userId, items] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) map.set(userId, parseStoredCart(items) ?? []);
  } catch {
    // Storage blocked or corrupt: start from the seed carts.
  }
  return map;
}

let carts: Map<string, CartItem[]> | null = null;
const db = () => carts ??= load();

function store(userId: string, items: CartItem[]): CartItem[] {
  db().set(userId, items);
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(Object.fromEntries(db())));
  } catch {
    // Not persisted; the saved cart lasts until reload.
  }
  return items;
}

/** Never trust what the browser sends: drop malformed lines, and refuse an oversized cart. */
function validLines(raw: unknown): CartItem[] {
  const items = parseStoredCart(raw);
  if (items === null || items.length > CART_MAX_LINES) throw new ApiError(i18n.t('jobs:order.cart.invalid'), 400);
  return items;
}

/** GET /cart — the signed-in customer's saved cart. */
export function getSavedCart(): Promise<CartItem[]> {
  return mockResponse(() => db().get(currentCustomerId()) ?? []);
}

/** PUT /cart — replaces the saved cart with the customer's current one (after each change while signed in). */
export function saveCart(items: CartItem[]): Promise<CartItem[]> {
  return mockResponse(() => store(currentCustomerId(), validLines(items)), SAVE_LATENCY_MS);
}

/** POST /cart/merge — joins the guest cart from this device into the saved cart; returns the result. */
export function mergeGuestCart(guestItems: CartItem[]): Promise<CartItem[]> {
  return mockResponse(() => {
    const userId = currentCustomerId();
    return store(userId, mergeCarts(db().get(userId) ?? [], validLines(guestItems)));
  });
}

/** Server side of checkout: the lines just ordered leave the saved cart. Sync, inside placeOrders. */
export function removeOrderedLinesNow(userId: string, ordered: Pick<CartItem, 'vendorId' | 'productId'>[]): void {
  const saved = db().get(userId);
  if (saved) store(userId, saved.filter((i) => !ordered.some((o) => sameLine(o, i))));
}

/** Tests only: forget the in-memory carts so the next call reloads them. */
export function resetCartStoreForTests(): void {
  carts = null;
}
