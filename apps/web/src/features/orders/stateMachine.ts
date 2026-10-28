import { addHours } from 'date-fns';
import { message, nested, type Message } from '../../domain/message';
import { FULFILMENT_METHOD, ORDER_ACTOR, ORDER_AUTO_COMPLETE_HOURS, ORDER_PATHS, ORDER_SIDE_BRANCHES, ORDER_STATUS, ORDER_STATUS_META } from './constants';
import type { Order, OrderActor, OrderStatus } from './types';

/**
 * The retail order lifecycle, as data (same approach as the jobs state machine). For each status:
 * where it may go next, and who may move it there. Anything not listed is rejected.
 *
 *   Placed ─▶ Confirmed ─▶ Preparing ─┬─▶ Dispatched ─▶ Delivered ─┬─▶ Completed
 *     │ │ │      │                    └─▶ Ready for pickup ─▶ Collected ─┘
 *     │ │ └──────┴─▶ Cancelled (customer, only before Preparing)
 *     │ └─▶ Out of stock (vendor: nothing could be supplied)
 *     └─▶ Declined (vendor)
 *
 *   Delivered / Collected ─▶ Disputed (customer reports a problem) ──(Gwani)──▶ Completed / Cancelled,
 *                                                                    or back to Delivered / Collected (dismissed)
 *
 * Delivery orders can only take the Dispatched branch and pickup orders only Ready for pickup (GUARDS).
 */
const { Customer, Vendor, System } = ORDER_ACTOR;

export const ORDER_TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, readonly OrderActor[]>>> = {
  placed: {
    confirmed: [Vendor],
    declined: [Vendor],
    out_of_stock: [Vendor],
    cancelled: [Customer]
  },
  confirmed: {
    preparing: [Vendor],
    cancelled: [Customer]
  },
  preparing: {
    dispatched: [Vendor],
    ready_for_pickup: [Vendor]
  },
  dispatched: {
    delivered: [Vendor]
  },
  delivered: {
    // "I've received it", or the platform after ORDER_AUTO_COMPLETE_HOURS.
    completed: [Customer, System],
    // "Report a problem" instead of confirming receipt.
    disputed: [Customer]
  },
  ready_for_pickup: {
    collected: [Vendor]
  },
  collected: {
    completed: [Customer, System],
    disputed: [Customer]
  },
  disputed: {
    // Gwani's team only: release (with or without a part refund), refund in full, or dismiss (back where it was).
    completed: [System],
    cancelled: [System],
    delivered: [System],
    collected: [System]
  },
  completed: {},
  declined: {},
  cancelled: {},
  out_of_stock: {}
};

type Guard = (order: Order, now: Date) => Message | null;

const deliveryOnly: Guard = (order) => order.method === FULFILMENT_METHOD.Delivery ? null : message('jobs:order.error.pickupNotDispatched');
const pickupOnly: Guard = (order) => order.method === FULFILMENT_METHOD.Pickup ? null : message('jobs:order.error.deliveryNotCollected');
const autoCompleteDue = (from: OrderStatus): Guard => (order, now) => {
  const at = orderReachedAt(order, from);
  return at && now >= addHours(new Date(at), ORDER_AUTO_COMPLETE_HOURS) ? null : message('jobs:order.error.stillTime');
};

/** Rules on top of the table: a move can be allowed in principle but not for this order, or not yet. */
const GUARDS: Partial<Record<`${OrderStatus}>${OrderStatus}`, Partial<Record<OrderActor, Guard>>>> = {
  'preparing>dispatched': { vendor: deliveryOnly },
  'preparing>ready_for_pickup': { vendor: pickupOnly },
  'delivered>completed': { system: autoCompleteDue(ORDER_STATUS.Delivered) },
  'collected>completed': { system: autoCompleteDue(ORDER_STATUS.Collected) },
  // Dismissing a dispute returns the order to the status it had when the problem was reported.
  'disputed>delivered': { system: (order) => statusBeforeOrderDispute(order) === ORDER_STATUS.Delivered ? null : message('jobs:order.error.wasntDelivered') },
  'disputed>collected': { system: (order) => statusBeforeOrderDispute(order) === ORDER_STATUS.Collected ? null : message('jobs:order.error.wasntCollected') }
};

/** The status an order had just before its latest dispute (where a dismissed dispute returns it). */
export function statusBeforeOrderDispute(order: Pick<Order, 'history'>): OrderStatus | null {
  const i = order.history.map((h) => h.status).lastIndexOf(ORDER_STATUS.Disputed);
  return i > 0 ? order.history[i - 1].status : null;
}

/** An order status label as a message, with the English label from ORDER_STATUS_META as the fallback. */
const statusLabel = (status: OrderStatus) => message(`jobs:order.status.${status}.label`, undefined, ORDER_STATUS_META[status].label);

/** Thrown by applyOrderTransition; `reason` says why, as a message (the Error message is its key). */
export class OrderTransitionError extends Error {
  constructor(readonly reason: Message) {
    super(reason.key);
    this.name = 'OrderTransitionError';
  }
}

/** When the order last reached a status, from its history. */
export function orderReachedAt(order: Pick<Order, 'history'>, status: OrderStatus): string | null {
  return [...order.history].reverse().find((h) => h.status === status)?.at ?? null;
}

export const isOrderEndState = (status: OrderStatus) => Object.keys(ORDER_TRANSITIONS[status]).length === 0;

/** Why `by` can't move the order to `to` right now, or null if they can. */
export function orderTransitionBlockedReason(order: Order, to: OrderStatus, by: OrderActor, now = new Date()): Message | null {
  const from = statusLabel(order.status);
  if (isOrderEndState(order.status)) return message('jobs:order.error.ended', { status: nested(from, { case: 'lower' }) });
  if (to === ORDER_STATUS.Cancelled && by === Customer && !ORDER_TRANSITIONS[order.status].cancelled) {
    return message('jobs:order.error.preparing');
  }
  if (!ORDER_TRANSITIONS[order.status][to]?.includes(by)) {
    const labels = { from: nested(from), to: nested(statusLabel(to)) };
    return by === System ? message('jobs:order.error.cantMove', labels) : message('jobs:order.error.cantMoveBy', { ...labels, by: nested(message(`jobs:actor.${by}`), { case: 'lower' }) });
  }
  return GUARDS[`${order.status}>${to}`]?.[by]?.(order, now) ?? null;
}

/** Statuses `by` can move this order to right now (table and guards). */
export function nextOrderStatuses(order: Order, by: OrderActor, now = new Date()): OrderStatus[] {
  return (Object.keys(ORDER_TRANSITIONS[order.status]) as OrderStatus[]).filter((to) => !orderTransitionBlockedReason(order, to, by, now));
}

/**
 * The only way to change an order's status. Checks the move, then returns a new order with the status
 * set and a history entry appended. `changes` sets related fields (e.g. out-of-stock lines) in the same step.
 */
export function applyOrderTransition(
order: Order,
to: OrderStatus,
by: OrderActor,
{ note, changes, at = new Date() }: {note?: string;changes?: Partial<Omit<Order, 'status' | 'history'>>;at?: Date;} = {})
: Order {
  const blocked = orderTransitionBlockedReason(order, to, by, at);
  if (blocked) throw new OrderTransitionError(blocked);
  const timestamp = at.toISOString();
  return {
    ...order,
    ...changes,
    status: to,
    history: [...order.history, { status: to, at: timestamp, by, ...(note ? { note } : {}) }],
    updatedAt: timestamp
  };
}

/** Where an order left its path, for the timeline: the last on-path status it reached. */
export function lastOrderPathStatus(order: Pick<Order, 'history'>): OrderStatus {
  const onPath = order.history.filter((h) => !ORDER_SIDE_BRANCHES.includes(h.status));
  return onPath[onPath.length - 1]?.status ?? ORDER_STATUS.Placed;
}

/** The path this order follows: delivery or pickup. */
export const orderPath = (order: Pick<Order, 'method'>) => ORDER_PATHS[order.method];

/** When the platform will complete the order if the customer doesn't confirm (null unless delivered/collected). */
export function orderAutoCompleteAt(order: Order): Date | null {
  if (order.status !== ORDER_STATUS.Delivered && order.status !== ORDER_STATUS.Collected) return null;
  const at = orderReachedAt(order, order.status);
  return at ? addHours(new Date(at), ORDER_AUTO_COMPLETE_HOURS) : null;
}
