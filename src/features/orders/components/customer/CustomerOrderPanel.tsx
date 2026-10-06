import { format } from 'date-fns';
import { PackageCheckIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { ReasonDialog } from '../../../jobs/components/ReasonDialog';
import { ReviewPrompt } from '../../../jobs/components/customer/ReviewPrompt';
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

/** What the customer can do now: confirm receipt, review, or cancel before the vendor starts preparing. */
export function CustomerOrderPanel({ order, onUpdated }: CustomerOrderPanelProps) {
  const a = useCustomerOrderActions(order, onUpdated);
  const autoAt = orderAutoCompleteAt(order);

  return (
    <div className="space-y-4">
      <OrderOutcomeNotice order={order} />

      <PaymentCard kind="order" id={order.id} refreshKey={order.updatedAt} viewer="customer" otherName={order.vendorName} />

      {order.status === ORDER_STATUS.ReadyForPickup && order.pickup &&
      <section className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 className="text-base font-bold text-ink">Ready for you to collect</h2>
          <p className="mt-1 text-sm text-muted">
            Go to <span className="font-semibold text-ink">{order.pickup.address}</span> and show order #{order.id}.
          </p>
        </section>
      }

      {a.canConfirmReceipt &&
      <section aria-labelledby="receipt-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 id="receipt-heading" className="flex items-center gap-2 text-base font-bold text-ink">
            <PackageCheckIcon className="h-5 w-5 text-pine" aria-hidden="true" />
            Got your order?
          </h2>
          <p className="mt-1 text-sm text-muted">
            {order.vendorName} marked it as {order.status === ORDER_STATUS.Delivered ? 'delivered' : 'collected'}. Confirm once you have everything.
            {autoAt && ` If you don’t, it completes automatically on ${format(autoAt, 'EEE d MMM, h:mm a')}.`}
          </p>
          <Button fullWidth className="mt-4" onClick={() => a.openDialog('receipt')}>
            Confirm receipt
          </Button>
        </section>
      }

      {a.showReview && <ReviewPrompt job={order} busy={a.busy} onSubmit={a.review} onSkip={a.skipReview} />}

      {order.review &&
      <section aria-labelledby="order-review-heading">
          <h2 id="order-review-heading" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Your review
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
          <p className="text-sm text-muted">You can cancel until {order.vendorName} starts preparing your order.</p>
          <Button variant="ghost" fullWidth className="mt-2" onClick={() => a.openDialog('cancel')}>
            Cancel order
          </Button>
        </div>
      }

      <ConfirmDialog
        open={a.dialog === 'receipt'}
        title="Confirm you received this order?"
        description={`This completes order #${order.id} from ${order.vendorName}. Only confirm once you have every item.`}
        confirmLabel="Yes, I have it"
        cancelLabel="Not yet"
        loading={a.busy === 'receipt'}
        onConfirm={a.confirmReceipt}
        onCancel={a.closeDialog} />

      <ReasonDialog
        open={a.dialog === 'cancel'}
        title={`Cancel order #${order.id}?`}
        description={`${order.vendorName} will be told, and anything they set aside goes back on sale. This can’t be undone.`}
        reasonLabel="Why are you cancelling?"
        confirmLabel="Cancel order"
        presets={ORDER_CANCEL_REASONS}
        required
        onConfirm={a.cancel}
        onCancel={a.closeDialog} />

    </div>);

}
