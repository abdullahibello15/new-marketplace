import { useTranslation } from 'react-i18next';
import { orderDeclineReasonLabel, orderStatusDescription, orderStatusLabel, orderStepText } from '../../../../i18n/labels';
import { formatDate } from '../../../../utils/format';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { ReasonDialog } from '../../../jobs/components/ReasonDialog';
import { PublicReviewCard } from '../../../public-profile/components/reviews/PublicReviewCard';
import { ORDER_AUTO_COMPLETE_HOURS, ORDER_DECLINE_REASONS, ORDER_STATUS_META, ORDER_VENDOR_STEPS } from '../../constants';
import { useVendorOrderActions } from '../../hooks/useVendorOrderActions';
import { orderAutoCompleteAt } from '../../stateMachine';
import { PaymentCard } from '../../../payments/components/PaymentCard';
import { OrderOutcomeNotice } from '../OrderOutcomeNotice';
import { DisputeNotice } from '../../../jobs/components/lifecycle/DisputeNotice';
import { ConfirmOrderDialog } from './ConfirmOrderDialog';
import type { Order } from '../../types';

interface VendorOrderPanelProps {
  order: Order;
  onUpdated: (order: Order) => void;
}

/** The vendor's next step on an order: confirm or decline a new one, then one button per allowed step. */
export function VendorOrderPanel({ order, onUpdated }: VendorOrderPanelProps) {
  const { t } = useTranslation('vendor');
  const a = useVendorOrderActions(order, onUpdated);
  const autoAt = orderAutoCompleteAt(order);
  const pending = a.pendingStep ? ORDER_VENDOR_STEPS[a.pendingStep] : undefined;

  return (
    <div className="space-y-4">
      <OrderOutcomeNotice order={order} />
      {order.dispute && <DisputeNotice dispute={order.dispute} viewer="vendor" />}

      {a.canRespond &&
      <section aria-labelledby="respond-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 id="respond-heading" className="text-base font-bold text-ink">{t('orders.newTitle')}</h2>
          <p className="mt-1 text-sm text-muted">
            {t('orders.newText')}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button fullWidth onClick={() => a.openDialog('confirm')}>
              {t('orders.confirm')}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => a.openDialog('decline')}>
              {t('orders.decline')}
            </Button>
          </div>
        </section>
      }

      {a.steps.length > 0 &&
      <section aria-labelledby="next-step-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 id="next-step-heading" className="text-base font-bold text-ink">{t('orders.nextStep')}</h2>
          <p className="mt-1 text-sm text-muted">{orderStatusDescription(order.status, ORDER_STATUS_META[order.status].description)}</p>
          <div className="mt-4 space-y-2">
            {a.steps.map((to) =>
          <Button key={to} fullWidth loading={a.busy === to} disabled={a.busy !== null} onClick={() => a.requestStep(to)}>
                {ORDER_VENDOR_STEPS[to] ? orderStepText(to, 'label', ORDER_VENDOR_STEPS[to].label) : orderStatusLabel(to, ORDER_STATUS_META[to].label)}
              </Button>
          )}
          </div>
        </section>
      }

      <PaymentCard kind="order" id={order.id} refreshKey={order.updatedAt} viewer="vendor" otherName={order.customerName} />

      {autoAt &&
      <p className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
          {t('orders.waitingReceipt', { name: order.customerName, date: formatDate(autoAt, 'EEE d MMM, h:mm a') })}
        </p>
      }

      {order.review &&
      <section aria-labelledby="vendor-order-review-heading">
          <h2 id="vendor-order-review-heading" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            {t('orders.customerReview')}
          </h2>
          <PublicReviewCard
          vendorName={order.vendorName}
          review={{
            id: `order-${order.id}`,
            reviewerName: order.customerName,
            rating: order.review.rating,
            comment: order.review.comment,
            serviceName: null,
            createdAt: order.review.at,
            reply: null
          }} />

        </section>
      }

      <ConfirmOrderDialog open={a.dialog === 'confirm'} order={order} busy={a.busy === 'confirm'} onConfirm={a.confirm} onClose={a.closeDialog} />
      <ReasonDialog
        open={a.dialog === 'decline'}
        title={t('orders.declineTitle', { id: order.id })}
        description={t('orders.declineText', { name: order.customerName })}
        reasonLabel={t('orders.declineReason')}
        confirmLabel={t('orders.declineConfirm')}
        presets={ORDER_DECLINE_REASONS.map((p) => ({ id: p.id, label: orderDeclineReasonLabel(p.id, p.label) }))}
        required
        onConfirm={a.decline}
        onCancel={a.closeDialog} />

      <ConfirmDialog
        open={pending?.confirm !== undefined}
        title={a.pendingStep && pending?.confirm ? orderStepText(a.pendingStep, 'confirmTitle', pending.confirm.title) : ''}
        description={a.pendingStep && pending?.confirm ? orderStepText(a.pendingStep, 'confirmText', pending.confirm.description, { hours: ORDER_AUTO_COMPLETE_HOURS }) : undefined}
        confirmLabel={a.pendingStep && pending ? orderStepText(a.pendingStep, 'label', pending.label) : t('orders.confirmFallback')}
        cancelLabel={t('orders.notYet')}
        loading={a.pendingStep !== null && a.busy === a.pendingStep}
        onConfirm={() => {
          if (a.pendingStep) void a.advance(a.pendingStep);
        }}
        onCancel={a.cancelStep} />

    </div>);

}
