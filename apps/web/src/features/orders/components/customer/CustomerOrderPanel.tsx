import { Trans, useTranslation } from 'react-i18next';
import { PackageCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { orderCancelReasonLabel } from '../../../../i18n/labels';
import { formatDate } from '../../../../utils/format';
import { ReasonDialog } from '../../../jobs/components/ReasonDialog';
import { ReviewPrompt } from '../../../jobs/components/customer/ReviewPrompt';
import { ReportProblemDialog } from '../../../jobs/components/customer/ReportProblemDialog';
import { DisputeNotice } from '../../../jobs/components/lifecycle/DisputeNotice';
import { PublicReviewCard } from '../../../public-profile/components/reviews/PublicReviewCard';
import { ORDER_CANCEL_REASONS, ORDER_STATUS } from '../../constants';
import { useCustomerOrderActions } from '../../hooks/useCustomerOrderActions';
import { orderAutoCompleteAt } from '../../stateMachine';
import { PaymentCard } from '../../../payments/components/PaymentCard';
import { OrderOutcomeNotice } from '../OrderOutcomeNotice';
import type { Order } from '../../types';

interface CustomerOrderPanelProps {
  order: Order;
  onUpdated: (order: Order) => void;
}

/** What the customer can do now: confirm receipt or report a problem, review, or cancel before the vendor starts preparing. */
export function CustomerOrderPanel({ order, onUpdated }: CustomerOrderPanelProps) {
  const { t } = useTranslation('jobs');
  const a = useCustomerOrderActions(order, onUpdated);
  const autoAt = orderAutoCompleteAt(order);

  return (
    <div className="space-y-4">
      <OrderOutcomeNotice order={order} />

      {order.dispute && <DisputeNotice dispute={order.dispute} viewer="customer" />}

      <PaymentCard kind="order" id={order.id} refreshKey={order.updatedAt} viewer="customer" otherName={order.vendorName} />

      {order.status === ORDER_STATUS.ReadyForPickup && order.pickup &&
      <section className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 className="text-base font-bold text-ink">{t('order.panel.readyTitle')}</h2>
          <p className="mt-1 text-sm text-muted">
            <Trans t={t} i18nKey="order.panel.readyText" values={{ address: order.pickup.address, id: order.id }} components={{ strong: <span className="font-semibold text-ink" /> }} />
          </p>
        </section>
      }

      {a.canConfirmReceipt &&
      <section aria-labelledby="receipt-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 id="receipt-heading" className="flex items-center gap-2 text-base font-bold text-ink">
            <PackageCheckIcon className="h-5 w-5 text-pine" aria-hidden="true" />
            {t('order.panel.gotIt')}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {order.status === ORDER_STATUS.Delivered ? t('order.panel.markedDelivered', { name: order.vendorName }) : t('order.panel.markedCollected', { name: order.vendorName })}
            {autoAt && t('order.panel.autoComplete', { date: formatDate(autoAt, 'EEE d MMM, h:mm a') })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" icon={TriangleAlertIcon} onClick={() => a.openDialog('report')} disabled={!a.canReport || a.busy !== null}>
              {t('order.panel.report')}
            </Button>
            <Button onClick={() => a.openDialog('receipt')}>{t('order.panel.confirmReceipt')}</Button>
          </div>
        </section>
      }

      {a.showReview && <ReviewPrompt job={order} busy={a.busy} onSubmit={a.review} onSkip={a.skipReview} />}

      {order.review &&
      <section aria-labelledby="order-review-heading">
          <h2 id="order-review-heading" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            {t('order.panel.yourReview')}
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

      {a.canCancel &&
      <div className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <p className="text-sm text-muted">{t('order.panel.canCancel', { name: order.vendorName })}</p>
          <Button variant="ghost" fullWidth className="mt-2" onClick={() => a.openDialog('cancel')}>
            {t('order.panel.cancel')}
          </Button>
        </div>
      }

      <ConfirmDialog
        open={a.dialog === 'receipt'}
        title={t('order.panel.receiptTitle')}
        description={t('order.panel.receiptText', { id: order.id, name: order.vendorName })}
        confirmLabel={t('order.panel.receiptConfirm')}
        cancelLabel={t('order.panel.notYet')}
        loading={a.busy === 'receipt'}
        onConfirm={a.confirmReceipt}
        onCancel={a.closeDialog} />

      <ReportProblemDialog open={a.dialog === 'report'} vendorName={order.vendorName} onSubmit={a.report} onClose={a.closeDialog} />

      <ReasonDialog
        open={a.dialog === 'cancel'}
        title={t('order.panel.cancelTitle', { id: order.id })}
        description={t('order.panel.cancelText', { name: order.vendorName })}
        reasonLabel={t('order.panel.cancelReason')}
        confirmLabel={t('order.panel.cancel')}
        presets={ORDER_CANCEL_REASONS.map((p) => ({ id: p.id, label: orderCancelReasonLabel(p.id, p.label) }))}
        required
        onConfirm={a.cancel}
        onCancel={a.closeDialog} />

    </div>);

}
