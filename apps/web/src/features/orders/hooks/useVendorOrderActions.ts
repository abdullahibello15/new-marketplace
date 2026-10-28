import { useState } from 'react';
import i18n from '../../../i18n';
import { orderStepText } from '../../../i18n/labels';
import { ORDER_ACTOR, ORDER_STATUS, ORDER_VENDOR_STEPS } from '../constants';
import { advanceOrder, confirmOrder, declineOrder } from '../services/orderService';
import { nextOrderStatuses } from '../stateMachine';
import { useOrderAction } from './useOrderAction';
import type { Order, OrderStatus } from '../types';
import { useCurrentVendor } from '../../auth/hooks/useCurrentVendor';

/** Statuses handled by their own dialogs rather than a plain "next step" button. */
const OWN_FLOW: readonly OrderStatus[] = [ORDER_STATUS.Confirmed, ORDER_STATUS.Declined, ORDER_STATUS.OutOfStock];

/** The vendor's actions on one order. The next-step buttons come straight from the state machine. */
export function useVendorOrderActions(order: Order, onUpdated: (order: Order) => void) {
  const { busy, run } = useOrderAction(onUpdated);
  const [dialog, setDialog] = useState<'confirm' | 'decline' | null>(null);
  const [pendingStep, setPendingStep] = useState<OrderStatus | null>(null);
  const { vendorId } = useCurrentVendor();

  const next = nextOrderStatuses(order, ORDER_ACTOR.Vendor);
  const canRespond = next.includes(ORDER_STATUS.Confirmed);
  const steps = next.filter((s) => !OWN_FLOW.includes(s));

  async function advance(to: OrderStatus) {
    const ok = await run(to, () => advanceOrder(order.id, vendorId, to), ORDER_VENDOR_STEPS[to] ? orderStepText(to, 'success', ORDER_VENDOR_STEPS[to].success) : i18n.t('vendor:orders.updated'));
    if (ok) setPendingStep(null);
  }

  return {
    busy,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    canRespond,
    steps,
    pendingStep,
    /** Steps with a confirmation open it first; the rest run straight away. */
    requestStep: (to: OrderStatus) => ORDER_VENDOR_STEPS[to]?.confirm ? setPendingStep(to) : void advance(to),
    cancelStep: () => setPendingStep(null),
    advance,
    confirm: (outOfStockIds: string[]) =>
    run(
      'confirm',
      () => confirmOrder(order.id, vendorId, outOfStockIds),
      outOfStockIds.length >= order.items.length ?
      i18n.t('vendor:orders.toastOutOfStock', { id: order.id, name: order.customerName }) :
      i18n.t('vendor:orders.toastConfirmed', { id: order.id })
    ),
    decline: (reason: string) => run('decline', () => declineOrder(order.id, vendorId, reason), i18n.t('vendor:orders.toastDeclined', { id: order.id, name: order.customerName }))
  };
}
