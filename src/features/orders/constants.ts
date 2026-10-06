import { ESCROW_CONFIG } from '../payments/escrow/escrowConfig';
import type { FulfilmentMethod, OrderActor, OrderStatus } from './types';

/**
 * Without a reply, a delivered or collected order completes automatically after this long. It's the
 * escrow release window (payments/escrow/escrowConfig.ts), so completing and releasing the money happen together.
 */
export const ORDER_AUTO_COMPLETE_HOURS = ESCROW_CONFIG.orderAutoReleaseHours;

/**
 * Every retail order status, in one place. Paths:
 *   Delivery: Placed → Confirmed → Preparing → Dispatched → Delivered → Completed
 *   Pickup:   Placed → Confirmed → Preparing → Ready for pickup → Collected → Completed
 * Side branches (end states): Declined, Cancelled, Out of stock.
 * Which moves are allowed, by whom and when, lives in stateMachine.ts.
 */
export const ORDER_STATUS = {
  Placed: 'placed',
  Confirmed: 'confirmed',
  Preparing: 'preparing',
  Dispatched: 'dispatched',
  Delivered: 'delivered',
  ReadyForPickup: 'ready_for_pickup',
  Collected: 'collected',
  Completed: 'completed',
  Declined: 'declined',
  Cancelled: 'cancelled',
  OutOfStock: 'out_of_stock'
} as const;

export const FULFILMENT_METHOD = {
  Pickup: 'pickup',
  Delivery: 'delivery'
} as const;

export const FULFILMENT_METHOD_LABELS: Record<FulfilmentMethod, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery'
};

/** The happy path for each way of getting an order. Used by the timeline and the state machine. */
export const ORDER_PATHS: Record<FulfilmentMethod, readonly OrderStatus[]> = {
  delivery: [
  ORDER_STATUS.Placed,
  ORDER_STATUS.Confirmed,
  ORDER_STATUS.Preparing,
  ORDER_STATUS.Dispatched,
  ORDER_STATUS.Delivered,
  ORDER_STATUS.Completed],

  pickup: [
  ORDER_STATUS.Placed,
  ORDER_STATUS.Confirmed,
  ORDER_STATUS.Preparing,
  ORDER_STATUS.ReadyForPickup,
  ORDER_STATUS.Collected,
  ORDER_STATUS.Completed]

};

/** Ways an order can leave its path. All are end states. */
export const ORDER_SIDE_BRANCHES: readonly OrderStatus[] = [ORDER_STATUS.Declined, ORDER_STATUS.Cancelled, ORDER_STATUS.OutOfStock];

/** Every status in display order (shared start, delivery steps, pickup steps, the end, then side branches). */
export const ORDER_STATUS_ORDER: readonly OrderStatus[] = [
ORDER_STATUS.Placed,
ORDER_STATUS.Confirmed,
ORDER_STATUS.Preparing,
ORDER_STATUS.Dispatched,
ORDER_STATUS.Delivered,
ORDER_STATUS.ReadyForPickup,
ORDER_STATUS.Collected,
ORDER_STATUS.Completed,
...ORDER_SIDE_BRANCHES];


export const ORDER_STATUS_META: Record<OrderStatus, {label: string;badgeClass: string;dotClass: string;description: string;}> = {
  placed: {
    label: 'Placed',
    badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]',
    dotClass: 'bg-[#2B4A7A]',
    description: 'Waiting for the vendor to confirm the order.'
  },
  confirmed: {
    label: 'Confirmed',
    badgeClass: 'bg-[#E3EEEC] text-pine',
    dotClass: 'bg-pine',
    description: 'The vendor accepted the order and set the items aside.'
  },
  preparing: {
    label: 'Preparing',
    badgeClass: 'bg-[#F7EBCB] text-mustard-dark',
    dotClass: 'bg-mustard-dark',
    description: 'The vendor is packing the order.'
  },
  dispatched: {
    label: 'Dispatched',
    badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]',
    dotClass: 'bg-[#5B3E8A]',
    description: 'On its way to the delivery address.'
  },
  delivered: {
    label: 'Delivered',
    badgeClass: 'bg-[#FFE8CC] text-[#8A4B00]',
    dotClass: 'bg-[#8A4B00]',
    description: 'The vendor says it was delivered. Waiting for the customer to confirm receipt.'
  },
  ready_for_pickup: {
    label: 'Ready for pickup',
    badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]',
    dotClass: 'bg-[#5B3E8A]',
    description: 'Packed and waiting at the vendor’s pickup point.'
  },
  collected: {
    label: 'Collected',
    badgeClass: 'bg-[#FFE8CC] text-[#8A4B00]',
    dotClass: 'bg-[#8A4B00]',
    description: 'The vendor says it was collected. Waiting for the customer to confirm receipt.'
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-pine text-white',
    dotClass: 'bg-white',
    description: 'The customer has the order. All done.'
  },
  declined: {
    label: 'Declined',
    badgeClass: 'bg-clay-soft text-clay-dark',
    dotClass: 'bg-clay-dark',
    description: 'The vendor can’t take this order.'
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-sand text-muted',
    dotClass: 'bg-muted',
    description: 'The customer cancelled the order.'
  },
  out_of_stock: {
    label: 'Out of stock',
    badgeClass: 'bg-[#F9E3EE] text-[#9D2E63]',
    dotClass: 'bg-[#9D2E63]',
    description: 'None of the items were in stock, so the vendor couldn’t fill the order.'
  }
};

/** Button labels for the vendor's next step, and an optional confirmation for steps the customer is told about. */
export const ORDER_VENDOR_STEPS: Partial<Record<OrderStatus, {label: string;success: string;confirm?: {title: string;description: string;};}>> = {
  preparing: { label: 'Start preparing', success: 'Marked as preparing.' },
  dispatched: {
    label: 'Mark as dispatched',
    success: 'Marked as dispatched. The customer can see it’s on the way.',
    confirm: { title: 'Mark as dispatched?', description: 'Do this when the order has left with you or your rider. The customer is told it’s on the way.' }
  },
  delivered: {
    label: 'Mark as delivered',
    success: 'Marked as delivered. The customer will confirm receipt.',
    confirm: {
      title: 'Mark as delivered?',
      description: `Only do this once the customer has the order. They’ll be asked to confirm, and it completes automatically after ${ORDER_AUTO_COMPLETE_HOURS} hours.`
    }
  },
  ready_for_pickup: {
    label: 'Ready for pickup',
    success: 'Marked as ready. The customer can come and collect it.',
    confirm: { title: 'Ready for pickup?', description: 'The customer is told they can come and collect the order now.' }
  },
  collected: {
    label: 'Mark as collected',
    success: 'Marked as collected. The customer will confirm receipt.',
    confirm: {
      title: 'Mark as collected?',
      description: `Only do this once the customer has collected the order. They’ll be asked to confirm, and it completes automatically after ${ORDER_AUTO_COMPLETE_HOURS} hours.`
    }
  }
};

export const ORDER_ACTOR = {
  Customer: 'customer',
  Vendor: 'vendor',
  System: 'system'
} as const;

export const ORDER_ACTOR_LABELS: Record<OrderActor, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  system: 'Gwani'
};


/** How often an open order page checks for changes made by the other side. */
export const ORDER_POLL_INTERVAL_MS = 20_000;

/* ---------- Cart ---------- */

/** localStorage key. Bump the version if the stored shape changes; old carts are then ignored. */
export const CART_STORAGE_KEY = 'gwani.cart.v1';

/** What can change between adding to cart and checking out. */
export const CART_CHANGE_KIND = {
  PriceChanged: 'price_changed',
  QuantityReduced: 'quantity_reduced',
  OutOfStock: 'out_of_stock',
  Unavailable: 'unavailable',
  VendorUnavailable: 'vendor_unavailable'
} as const;

/* ---------- Reasons ---------- */

export const ORDER_CANCEL_REASONS: {id: string;label: string;}[] = [
{ id: 'changed_mind', label: 'I changed my mind' },
{ id: 'ordered_by_mistake', label: 'I ordered the wrong items' },
{ id: 'too_slow', label: 'It’s taking too long' },
{ id: 'found_elsewhere', label: 'I found it elsewhere' }];


export const ORDER_DECLINE_REASONS: {id: string;label: string;}[] = [
{ id: 'closed', label: 'My shop is closed right now' },
{ id: 'cant_deliver', label: 'I can’t deliver or hand over in time' },
{ id: 'price_error', label: 'A price on my shop was wrong' }];


/* ---------- Checkout form ---------- */

export const DELIVERY_LANDMARK_MIN = 5;
export const DELIVERY_LANDMARK_MAX = 200;
/** Nigerian mobile numbers: 0803 555 0142 or +234 803 555 0142. */
export const NIGERIAN_PHONE_PATTERN = /^(?:\+234|0)[789][01]\d{8}$/;

/* ---------- Routes ---------- */

export const ORDER_ROUTES = {
  cart: '/cart',
  checkout: '/checkout',
  myOrders: '/orders',
  order: (id: string) => `/orders/${encodeURIComponent(id)}`
} as const;

export const VENDOR_ORDER_ROUTES = {
  orders: '/pro/orders',
  order: (id: string) => `/pro/orders/${encodeURIComponent(id)}`
} as const;
