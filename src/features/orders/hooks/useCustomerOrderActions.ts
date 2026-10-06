import { useState } from 'react';
import { ORDER_ACTOR, ORDER_STATUS } from '../constants';
import { cancelOrder, confirmReceipt, reviewOrder, skipOrderReview } from '../services/orderService';
import { orderTransitionBlockedReason } from '../stateMachine';
import { useOrderAction } from './useOrderAction';
import type { ReviewFormData } from '../../jobs/schemas';
import type { Order } from '../types';

/** The customer's actions on one order: cancel (before preparing), confirm receipt, review or skip. */
export function useCustomerOrderActions(order: Order, onUpdated: (order: Order) => void) {
  const { busy, run } = useOrderAction(onUpdated);
  const [dialog, setDialog] = useState<'cancel' | 'receipt' | null>(null);

  const canCancel = !orderTransitionBlockedReason(order, ORDER_STATUS.Cancelled, ORDER_ACTOR.Customer);
  const canConfirmReceipt = !orderTransitionBlockedReason(order, ORDER_STATUS.Completed, ORDER_ACTOR.Customer);
  const showReview = order.status === ORDER_STATUS.Completed && !order.review && !order.reviewSkipped;

  return {
    busy,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    canCancel,
    canConfirmReceipt,
    showReview,
    cancel: (reason: string) =>
    run('cancel', () => cancelOrder(order.id, reason), `Order #${order.id} cancelled. ${order.vendorName} has been told.`),
    confirmReceipt: async () => {
      if (await run('receipt', () => confirmReceipt(order.id), 'Thanks for confirming. The order is complete.')) setDialog(null);
    },
    review: (data: ReviewFormData) => run('review', () => reviewOrder(order.id, data), 'Thanks! Your review is on their profile.'),
    skipReview: () => {
      void run('skip', () => skipOrderReview(order.id), 'Okay, no review.');
    }
  };
}
