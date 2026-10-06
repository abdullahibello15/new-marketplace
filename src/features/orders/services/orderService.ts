import { user } from '../../../data/user';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { adjustProductStock, getAllVendors } from '../../../services/vendorStore';
import { withListingRestrictions } from '../../vendor-dashboard/services/subscriptionService';
import { CURRENT_CUSTOMER_ID } from '../../jobs/constants';
import { CART_CHANGE_KIND, FULFILMENT_METHOD, ORDER_ACTOR, ORDER_AUTO_COMPLETE_HOURS, ORDER_STATUS } from '../constants';
import { applyOrderEscrowChange } from '../../payments/services/escrowService';
import { mockOrders } from '../mock/orders';
import { OrderTransitionError, applyOrderTransition, orderTransitionBlockedReason } from '../stateMachine';
import { deliveryBlockedReason, enabledMethods, feeFor, fulfilmentFor } from '../utils/fulfilment';
import type { Product, Vendor } from '../../../types/marketplace';
import type { StarLevel } from '../../vendor-dashboard/types';
import type {
  CartChange,
  CartCheck,
  CartItem,
  CheckoutInput,
  CheckoutResult,
  Order,
  OrderActor,
  OrderItem,
  OrderStatus } from
'../types';

/*
 * The one order store for the whole app: the customer's My Orders and each vendor's Orders read and
 * write here. Every status change goes through the state machine; nothing sets `status` directly.
 */
let orders: Order[] = structuredClone(mockOrders);
let nextId = Math.max(...orders.map((o) => Number(o.id))) + 1;

/** Rejected checkout because the cart no longer matches the shop. The UI shows `changes` and asks to confirm. */
export class CheckoutChangedError extends ApiError {
  readonly changes: CartChange[];

  constructor(changes: CartChange[]) {
    super('Some items in your cart changed. Check the changes and confirm to continue.', 409);
    this.name = 'CheckoutChangedError';
    this.changes = changes;
  }
}

const newestFirst = (a: Order, b: Order) => b.updatedAt.localeCompare(a.updatedAt);

function findOrder(id: string): Order {
  const found = orders.find((o) => o.id === id);
  if (!found) throw new ApiError('We couldn’t find that order.', 404);
  return found;
}

/** The vendor as customers see them (unavailable while their subscription has lapsed past grace). */
function findVendor(id: string): Vendor | undefined {
  const vendor = getAllVendors().find((v) => v.id === id);
  return vendor && withListingRestrictions(vendor);
}

function save(updated: Order): Order {
  orders = orders.map((o) => o.id === updated.id ? updated : o);
  return updated;
}

/** Runs a state-machine transition and saves it. Blocked moves become a 409 the UI can show. */
function transition(order: Order, to: OrderStatus, by: OrderActor, options: Parameters<typeof applyOrderTransition>[3] = {}): Order {
  try {
    const saved = save(applyOrderTransition(order, to, by, options));
    // State-machine event → escrow (release on completion, refund if it ends early or items are dropped).
    applyOrderEscrowChange(saved, order.status);
    return saved;
  } catch (e) {
    if (e instanceof OrderTransitionError) throw new ApiError(e.message, 409);
    throw e;
  }
}

/** Puts back the stock a confirmed order took (cancelled after confirming). Uses the shared stock logic. */
function releaseStock(order: Order): Partial<Order> {
  if (!order.stockReserved) return {};
  adjustProductStock(
    order.vendorId,
    order.items.filter((i) => !i.outOfStock).map((i) => ({ productId: i.productId, delta: i.quantity }))
  );
  return { stockReserved: false };
}

/**
 * MOCK of the server's scheduled task: delivered or collected orders the customer hasn't confirmed
 * complete automatically after ORDER_AUTO_COMPLETE_HOURS (72). Runs before every read; the state machine's guard decides when.
 */
export function runScheduledOrderTasks(now = new Date()): void {
  for (const o of orders) {
    if (!orderTransitionBlockedReason(o, ORDER_STATUS.Completed, ORDER_ACTOR.System, now)) {
      transition(o, ORDER_STATUS.Completed, ORDER_ACTOR.System, { note: `Completed automatically: no reply within ${ORDER_AUTO_COMPLETE_HOURS} hours`, at: now });
    }
  }
}

/* ---------- Reads ---------- */

/** GET /me/orders — the signed-in customer's orders, most recently updated first. */
export function listCustomerOrders(): Promise<Order[]> {
  return mockResponse(() => {
    runScheduledOrderTasks();
    return orders.filter((o) => o.customerId === CURRENT_CUSTOMER_ID).sort(newestFirst);
  });
}

/** GET /vendor/orders — only this vendor's orders; each vendor sees their part of a checkout, nothing else. */
export function listVendorOrders(vendorId: string): Promise<Order[]> {
  return mockResponse(() => {
    runScheduledOrderTasks();
    return orders.filter((o) => o.vendorId === vendorId).sort(newestFirst);
  });
}

/** GET /orders/:id */
export function getOrder(id: string): Promise<Order> {
  return mockResponse(() => {
    runScheduledOrderTasks();
    return findOrder(id);
  });
}

/** Reviews customers left on this vendor's orders, for the vendor's public profile. */
export function orderReviewsForVendor(vendorId: string) {
  return orders.flatMap((o) =>
  o.vendorId === vendorId && o.review ?
  [{ orderId: o.id, customerName: o.customerName, itemsSummary: o.items.map((i) => i.name).join(', '), ...o.review }] :
  []
  );
}

/* ---------- Cart and checkout ---------- */

/** Can this product be ordered at all? (Shown, photographed and in stock — the same rule as the shop grid.) */
const orderable = (p: Product) => p.available && p.images.length > 0;

/**
 * Compares cart lines with the live shop: price changes, less stock, sold out, hidden products and
 * vendors who stopped taking orders. Returns the corrected lines plus what changed.
 */
function compareCart(items: CartItem[]): {items: CartItem[];changes: CartChange[];} {
  const corrected: CartItem[] = [];
  const changes: CartChange[] = [];
  for (const line of items) {
    const vendor = findVendor(line.vendorId);
    const product = vendor?.products.find((p) => p.id === line.productId);
    const base = { vendorId: line.vendorId, vendorName: vendor?.name ?? line.vendorName, productId: line.productId, name: product?.name ?? line.name };
    if (!vendor || vendor.unavailable) {
      changes.push({ ...base, kind: CART_CHANGE_KIND.VendorUnavailable, before: line.quantity, after: 0 });
      continue;
    }
    if (!product || !orderable(product)) {
      changes.push({ ...base, kind: CART_CHANGE_KIND.Unavailable, before: line.quantity, after: 0 });
      continue;
    }
    if (product.stock <= 0) {
      changes.push({ ...base, kind: CART_CHANGE_KIND.OutOfStock, before: line.quantity, after: 0 });
      continue;
    }
    if (product.price !== line.unitPrice) {
      changes.push({ ...base, kind: CART_CHANGE_KIND.PriceChanged, before: line.unitPrice, after: product.price });
    }
    const quantity = Math.min(line.quantity, product.stock);
    if (quantity < line.quantity) {
      changes.push({ ...base, kind: CART_CHANGE_KIND.QuantityReduced, before: line.quantity, after: quantity });
    }
    corrected.push({
      ...line,
      vendorName: vendor.name,
      name: product.name,
      image: product.images[0] ?? null,
      unitPrice: product.price,
      quantity,
      maxQuantity: product.stock
    });
  }
  return { items: corrected, changes };
}

/** POST /cart/check — what the cart looks like against the live shop, and each vendor's pickup/delivery options. */
export function checkCart(items: CartItem[]): Promise<CartCheck> {
  return mockResponse(() => {
    const result = compareCart(items);
    const vendorIds = [...new Set(result.items.map((i) => i.vendorId))];
    const vendors = vendorIds.flatMap((id) => {
      const v = findVendor(id);
      return v ? [{ vendorId: v.id, vendorName: v.name, fulfilment: fulfilmentFor(v) }] : [];
    });
    return { ...result, vendors };
  }, 500);
}

/**
 * POST /checkout — one order per vendor, all sharing a checkout reference. Rejects with
 * CheckoutChangedError if any price or stock changed since the customer last confirmed the cart,
 * so nobody is charged a price they didn't see.
 */
export function placeOrders(input: CheckoutInput): Promise<CheckoutResult> {
  return mockResponse(() => {
    if (input.orders.length === 0) throw new ApiError('Your cart is empty.', 400);
    const asCart: CartItem[] = input.orders.flatMap((o) =>
    o.items.map((i) => ({
      vendorId: o.vendorId,
      vendorName: '',
      productId: i.productId,
      name: '',
      image: null,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      maxQuantity: i.quantity,
      addedAt: ''
    }))
    );
    const { changes } = compareCart(asCart);
    if (changes.length > 0) throw new CheckoutChangedError(changes);

    const now = new Date().toISOString();
    const checkoutRef = `CHK-${Math.floor(100000 + Math.random() * 900000)}`;
    const created: Order[] = input.orders.map((o) => {
      const vendor = findVendor(o.vendorId);
      if (!vendor) throw new ApiError('One of the shops in your cart closed. Please remove its items.', 409);
      const f = fulfilmentFor(vendor);
      if (!enabledMethods(f).includes(o.method)) {
        throw new ApiError(`${vendor.name} no longer offers ${o.method}. Please choose again.`, 409);
      }
      if (o.method === FULFILMENT_METHOD.Delivery) {
        if (!input.delivery) throw new ApiError('Add a delivery address and phone number.', 400);
        const blocked = deliveryBlockedReason(f, vendor.name, input.delivery.lga);
        if (blocked) throw new ApiError(blocked, 409);
      }
      const items: OrderItem[] = o.items.map((i) => {
        const product = vendor.products.find((p) => p.id === i.productId);
        return { productId: i.productId, name: product?.name ?? 'Item', image: product?.images[0] ?? null, unitPrice: i.unitPrice, quantity: i.quantity, outOfStock: false };
      });
      const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const deliveryFee = feeFor(f, o.method);
      return {
        id: String(nextId++),
        checkoutRef,
        vendorId: vendor.id,
        vendorName: vendor.name,
        customerId: CURRENT_CUSTOMER_ID,
        customerName: user.fullName,
        items,
        method: o.method,
        delivery: o.method === FULFILMENT_METHOD.Delivery ? input.delivery : null,
        pickup: o.method === FULFILMENT_METHOD.Pickup ? { address: f.pickup.address, instructions: f.pickup.instructions } : null,
        itemsTotal,
        deliveryFee,
        total: itemsTotal + deliveryFee,
        status: ORDER_STATUS.Placed,
        history: [{ status: ORDER_STATUS.Placed, at: now, by: ORDER_ACTOR.Customer }],
        stockReserved: false,
        review: null,
        reviewSkipped: false,
        createdAt: now,
        updatedAt: now
      };
    });
    orders = [...created, ...orders];
    return { checkoutRef, orders: created };
  }, 900);
}

/* ---------- Vendor actions ---------- */

function ownOrder(id: string, vendorId: string): Order {
  const found = findOrder(id);
  if (found.vendorId !== vendorId) throw new ApiError('You can only manage your own orders.', 403);
  return found;
}

/**
 * The vendor accepts the order. Lines in `outOfStockIds` are dropped (not supplied, not charged); if
 * that's every line, the order ends as Out of stock instead. Stock for the rest is taken now.
 */
export function confirmOrder(id: string, vendorId: string, outOfStockIds: string[]): Promise<Order> {
  return mockResponse(() => {
    const current = ownOrder(id, vendorId);
    const items = current.items.map((i) => ({ ...i, outOfStock: outOfStockIds.includes(i.productId) }));
    const supplied = items.filter((i) => !i.outOfStock);
    if (supplied.length === 0) {
      return transition(current, ORDER_STATUS.OutOfStock, ORDER_ACTOR.Vendor, { note: 'None of the items were in stock', changes: { items } });
    }
    const blocked = orderTransitionBlockedReason(current, ORDER_STATUS.Confirmed, ORDER_ACTOR.Vendor);
    if (blocked) throw new ApiError(blocked, 409);

    const products = findVendor(vendorId)?.products ?? [];
    for (const line of supplied) {
      const stock = products.find((p) => p.id === line.productId)?.stock ?? 0;
      if (stock < line.quantity) {
        throw new ApiError(
          `You have ${stock} × ${line.name} in stock but the order needs ${line.quantity}. Mark it out of stock, or update your stock first.`,
          409
        );
      }
    }
    adjustProductStock(vendorId, supplied.map((i) => ({ productId: i.productId, delta: -i.quantity })));

    const dropped = items.filter((i) => i.outOfStock);
    const itemsTotal = supplied.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return transition(current, ORDER_STATUS.Confirmed, ORDER_ACTOR.Vendor, {
      note: dropped.length ? `${dropped.length} ${dropped.length === 1 ? 'item' : 'items'} out of stock: ${dropped.map((i) => i.name).join(', ')}` : undefined,
      changes: { items, itemsTotal, total: itemsTotal + current.deliveryFee, stockReserved: true }
    });
  }, 700);
}

/** The vendor turns the order down (before confirming, so no stock was taken). */
export function declineOrder(id: string, vendorId: string, reason: string): Promise<Order> {
  return mockResponse(() => {
    const current = ownOrder(id, vendorId);
    return transition(current, ORDER_STATUS.Declined, ORDER_ACTOR.Vendor, { note: reason || undefined, changes: releaseStock(current) });
  });
}

/** The vendor's next fulfilment step: preparing, dispatched, delivered, ready for pickup or collected. */
export function advanceOrder(id: string, vendorId: string, to: OrderStatus): Promise<Order> {
  return mockResponse(() => transition(ownOrder(id, vendorId), to, ORDER_ACTOR.Vendor));
}

/* ---------- Customer actions ---------- */

function customerOrder(id: string): Order {
  const found = findOrder(id);
  if (found.customerId !== CURRENT_CUSTOMER_ID) throw new ApiError('We couldn’t find that order.', 404);
  return found;
}

/** Only before the vendor starts preparing (the state machine enforces it). Puts back any stock taken. */
export function cancelOrder(id: string, reason: string): Promise<Order> {
  return mockResponse(() => {
    const current = customerOrder(id);
    const blocked = orderTransitionBlockedReason(current, ORDER_STATUS.Cancelled, ORDER_ACTOR.Customer);
    if (blocked) throw new ApiError(blocked, 409);
    return transition(current, ORDER_STATUS.Cancelled, ORDER_ACTOR.Customer, { note: reason || undefined, changes: releaseStock(current) });
  });
}

export function confirmReceipt(id: string): Promise<Order> {
  return mockResponse(() => transition(customerOrder(id), ORDER_STATUS.Completed, ORDER_ACTOR.Customer));
}

export function reviewOrder(id: string, input: {rating: StarLevel;comment: string;}): Promise<Order> {
  return mockResponse(() => {
    const current = customerOrder(id);
    if (current.status !== ORDER_STATUS.Completed) throw new ApiError('You can review an order once you’ve received it.', 409);
    if (current.review) throw new ApiError('You’ve already reviewed this order.', 409);
    return save({ ...current, review: { ...input, at: new Date().toISOString() }, updatedAt: new Date().toISOString() });
  });
}

export function skipOrderReview(id: string): Promise<Order> {
  return mockResponse(() => save({ ...customerOrder(id), reviewSkipped: true }));
}

