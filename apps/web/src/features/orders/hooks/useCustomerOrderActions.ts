import { useState } from 'react';
import i18n from '../../../i18n';
import { ORDER_ACTOR, ORDER_STATUS } from '../constants';
import { cancelOrder, confirmReceipt, reportOrderProblem, reviewOrder, skipOrderReview } from '../services/orderService';
import { orderTransitionBlockedReason } from '../stateMachine';
import { useOrderAction } from './useOrderAction';
import type { ReportProblemFormData, ReviewFormData } from '../../jobs/schemas';
import type { Order } from '../types';

/** The customer's actions on one order: cancel (before preparing), confirm receipt or report a problem, review or skip. */
export function useCustomerOrderActions(order: Order, onUpdated: (order: Order) => void) {
  const { busy, run } = useOrderAction(onUpdated);
  const [dialog, setDialog] = useState<'cancel' | 'receipt' | 'report' | null>(null);

  const canCancel = !orderTransitionBlockedReason(order, ORDER_STATUS.Cancelled, ORDER_ACTOR.Customer);
  const canConfirmReceipt = !orderTransitionBlockedReason(order, ORDER_STATUS.Completed, ORDER_ACTOR.Customer);
  const canReport = !orderTransitionBlockedReason(order, ORDER_STATUS.Disputed, ORDER_ACTOR.Customer);
  const showReview = order.status === ORDER_STATUS.Completed && !order.review && !order.reviewSkipped;

  return {
    busy,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    canCancel,
    canConfirmReceipt,
    canReport,
    showReview,
    cancel: (reason: string) =>
    run('cancel', () => cancelOrder(order.id, reason), i18n.t('jobs:order.toast.cancelled', { id: order.id, name: order.vendorName })),
    confirmReceipt: async () => {
      if (await run('receipt', () => confirmReceipt(order.id), i18n.t('jobs:order.toast.received'))) setDialog(null);
    },
    report: (data: ReportProblemFormData) =>
    run('report', () => reportOrderProblem(order.id, data), i18n.t('jobs:order.toast.reported')),
    review: (data: ReviewFormData) => run('review', () => reviewOrder(order.id, data), i18n.t('jobs:order.toast.reviewed')),
    skipReview: () => {
      void run('skip', () => skipOrderReview(order.id), i18n.t('jobs:order.toast.skipped'));
    }
  };
}
