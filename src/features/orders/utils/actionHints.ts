import { ORDER_ACTOR, ORDER_STATUS } from '../constants';
import type { Order, OrderParty } from '../types';

/** A short prompt on an order card when this person needs to do something, or null. */
export function orderActionHint(order: Order, viewer: OrderParty): string | null {
  if (viewer === ORDER_ACTOR.Customer) {
    if (order.status === ORDER_STATUS.ReadyForPickup) return 'Ready: go and collect it';
    if (order.status === ORDER_STATUS.Delivered || order.status === ORDER_STATUS.Collected) return 'Got it? Confirm receipt';
    if (order.status === ORDER_STATUS.Completed && !order.review && !order.reviewSkipped) return 'Rate and review this order';
    return null;
  }
  switch (order.status) {
    case ORDER_STATUS.Placed:
      return 'New order: confirm or decline';
    case ORDER_STATUS.Confirmed:
      return 'Confirmed: start preparing';
    case ORDER_STATUS.Preparing:
      return order.delivery ? 'Packed? Mark as dispatched' : 'Packed? Mark as ready for pickup';
    case ORDER_STATUS.Dispatched:
      return 'On the way: mark as delivered';
    case ORDER_STATUS.ReadyForPickup:
      return 'Waiting for the customer to collect';
    default:
      return null;
  }
}
