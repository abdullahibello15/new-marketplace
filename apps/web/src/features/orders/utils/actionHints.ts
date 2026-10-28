import i18n from '../../../i18n';
import { ORDER_ACTOR, ORDER_STATUS } from '../constants';
import type { Order, OrderParty } from '../types';

/** A short prompt on an order card when this person needs to do something, or null. */
export function orderActionHint(order: Order, viewer: OrderParty): string | null {
  if (viewer === ORDER_ACTOR.Customer) {
    if (order.status === ORDER_STATUS.ReadyForPickup) return i18n.t('jobs:order.hint.collect');
    if (order.status === ORDER_STATUS.Delivered || order.status === ORDER_STATUS.Collected) return i18n.t('jobs:order.hint.confirmReceipt');
    if (order.status === ORDER_STATUS.Completed && !order.review && !order.reviewSkipped) return i18n.t('jobs:order.hint.review');
    return null;
  }
  switch (order.status) {
    case ORDER_STATUS.Placed:
      return i18n.t('jobs:order.hint.newOrder');
    case ORDER_STATUS.Confirmed:
      return i18n.t('jobs:order.hint.startPreparing');
    case ORDER_STATUS.Preparing:
      return order.delivery ? i18n.t('jobs:order.hint.markDispatched') : i18n.t('jobs:order.hint.markReady');
    case ORDER_STATUS.Dispatched:
      return i18n.t('jobs:order.hint.markDelivered');
    case ORDER_STATUS.ReadyForPickup:
      return i18n.t('jobs:order.hint.waitingCollect');
    default:
      return null;
  }
}
