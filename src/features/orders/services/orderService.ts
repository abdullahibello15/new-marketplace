import i18n from '../../../i18n';
import { fulfilmentMethodLabel } from '../../../i18n/labels';
import { currentCustomerId, requireUser, requireVerifiedContact } from '../../auth/session';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { adjustProductStock, getAllVendors } from '../../../services/vendorStore';
import { withListingRestrictions } from '../../vendor-dashboard/services/subscriptionService';
import { DISPUTE_OUTCOME, DISPUTE_OUTCOME_LABELS } from '../../jobs/constants';
import { formatNaira } from '../../../utils/format';
import { CART_CHANGE_KIND, FULFILMENT_METHOD, ORDER_ACTOR, ORDER_AUTO_COMPLETE_HOURS, ORDER_STATUS } from '../constants';
import { applyOrderEscrowChange } from '../../payments/services/escrowService';
import { mockOrders } from '../mock/orders';
import { removeOrderedLinesNow } from './cartService';
import { OrderTransitionError, applyOrderTransition, orderTransitionBlockedReason, statusBeforeOrderDispute } from '../stateMachine';
import { deliveryBlockedReason, enabledMethods, feeFor, fulfilmentFor } from '../utils/fulfilment';
import type { Product, Vendor } from '../../../types/marketplace';
import type { StarLevel } from '../../vendor-dashboard/types';
import type { DisputeOutcome, DisputeReason } from '../../jobs/types';
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
  if (!found) throw new ApiError(i18n.t('jobs:order.error.notFound'), 404);
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
    // Only orders waiting for receipt. A disputed order completes only when Gwani's team resolves it.
    if (o.status !== ORDER_STATUS.Delivered && o.status !== ORDER_STATUS.Collected) continue;
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
    return orders.filter((o) => o.customerId === currentCustomerId()).sort(newestFirst);
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
    // Signed-in customers with a verified email or phone only (401/403 otherwise): a guest can't skip
    // sign-up by calling checkout directly.
    requireVerifiedContact();
    const customerId = currentCustomerId();
    if (input.orders.length === 0) throw new ApiError(i18n.t('jobs:order.error.emptyCart'), 400);
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
      if (!vendor) throw new ApiError(i18n.t('jobs:order.error.shopClosed'), 409);
      const f = fulfilmentFor(vendor);
      if (!enabledMethods(f).includes(o.method)) {
        throw new ApiError(i18n.t('jobs:order.error.methodGone', { name: vendor.name, method: fulfilmentMethodLabel(o.method) }), 409);
      }
      if (o.method === FULFILMENT_METHOD.Delivery) {
        if (!input.delivery) throw new ApiError(i18n.t('jobs:order.error.addDelivery'), 400);
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
        customerId,
        customerName: requireUser().name,
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
        dispute: null,
        createdAt: now,
        updatedAt: now
      };
    });
    orders = [...created, ...orders];
    // What was just ordered leaves the cart saved to their account (other devices see it gone too).
    removeOrderedLinesNow(customerId, input.orders.flatMap((o) => o.items.map((i) => ({ vendorId: o.vendorId, productId: i.productId }))));
    return { checkoutRef, orders: created };
  }, 900);
}

/* ---------- Vendor actions ---------- */

function ownOrder(id: string, vendorId: string): Order {
  const found = findOrder(id);
  if (found.vendorId !== vendorId) throw new ApiError(i18n.t('jobs:order.error.notYours'), 403);
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
          i18n.t('jobs:order.error.notEnoughStock', { stock, name: line.name, needed: line.quantity }),
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
  if (found.customerId !== currentCustomerId()) throw new ApiError(i18n.t('jobs:order.error.notFound'), 404);
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
    if (current.status !== ORDER_STATUS.Completed) throw new ApiError(i18n.t('jobs:order.error.reviewWhen'), 409);
    if (current.review) throw new ApiError(i18n.t('jobs:order.error.reviewed'), 409);
    return save({ ...current, review: { ...input, at: new Date().toISOString() }, updatedAt: new Date().toISOString() });
  });
}

export function skipOrderReview(id: string): Promise<Order> {
  return mockResponse(() => save({ ...customerOrder(id), reviewSkipped: true }));
}

/**
 * POST /orders/:id/problem — "Report a problem" instead of confirming receipt (Delivered or Collected only;
 * the state machine enforces it). The order becomes Disputed and escrow holds the money for Gwani's team.
 */
export function reportOrderProblem(id: string, input: {reason: DisputeReason;details: string;}): Promise<Order> {
  return mockResponse(() =>
  transition(customerOrder(id), ORDER_STATUS.Disputed, ORDER_ACTOR.Customer, {
    note: input.details,
    changes: { dispute: { ...input, at: new Date().toISOString() } }
  })
  );
}

/* ---------- Gwani's team ---------- */

/**
 * Resolves a disputed order (same outcomes as jobs): release to the vendor → Completed; full refund →
 * Cancelled; partial refund → Completed with part refunded; dismiss → back to Delivered or Collected (held
 * again). Escrow follows from the status change. The refund is worked out here, except a partial refund's amount.
 */
export function resolveOrderDispute(id: string, outcome: DisputeOutcome, refundAmount: number, reason?: string): Promise<Order> {
  return mockResponse(() => {
    const current = findOrder(id);
    if (current.status !== ORDER_STATUS.Disputed || !current.dispute) throw new ApiError(i18n.t('jobs:order.error.notDisputed'), 409);
    const refund = outcome === DISPUTE_OUTCOME.RefundCustomer ? current.total : outcome === DISPUTE_OUTCOME.Split ? Math.round(refundAmount) : 0;
    if (outcome === DISPUTE_OUTCOME.Split && (!(refund > 0) || refund >= current.total)) {
      throw new ApiError(i18n.t('common:error.partialRefund', { max: formatNaira(current.total) }), 400);
    }
    const to =
    outcome === DISPUTE_OUTCOME.RefundCustomer ? ORDER_STATUS.Cancelled : outcome === DISPUTE_OUTCOME.Dismiss ? statusBeforeOrderDispute(current) : ORDER_STATUS.Completed;
    if (!to) throw new ApiError(i18n.t('jobs:order.error.beforeDispute'), 409);
    const resolution = { outcome, refundAmount: refund, at: new Date().toISOString(), ...(reason ? { reason } : {}) };
    return transition(current, to, ORDER_ACTOR.System, {
      note: reason ? `${DISPUTE_OUTCOME_LABELS[outcome]}: ${reason}` : DISPUTE_OUTCOME_LABELS[outcome],
      // No stock goes back on a refund: the goods already left the shop when it was delivered or collected.
      changes: { dispute: { ...current.dispute, resolution } }
    });
  }, 700);
}


/** Every order as stored right now (read-only), for Gwani's admin tools (disputes). Runs the scheduled tasks first. */
export function ordersSnapshot(): readonly Order[] {
  runScheduledOrderTasks();
  return orders;
}
