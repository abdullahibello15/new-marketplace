import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { LockIcon } from 'lucide-react';
import { JobPhotos } from '../../../jobs/components/JobPhotos';
import { JobStatusBadge } from '../../../jobs/components/JobStatusBadge';
import { JobStatusHistory } from '../../../jobs/components/JobStatusHistory';
import { JobTimeline } from '../../../jobs/components/JobTimeline';
import { QuoteCard } from '../../../jobs/components/QuoteCard';
import { CancellationNotice } from '../../../jobs/components/cancel/CancellationNotice';
import { ArrivalNotice } from '../../../jobs/components/lifecycle/ArrivalNotice';
import { RescheduleHistory } from '../../../jobs/components/reschedule/RescheduleHistory';
import { OrderFulfilmentDetails } from '../../../orders/components/OrderFulfilmentDetails';
import { OrderItemsList } from '../../../orders/components/OrderItemsList';
import { OrderStatusBadge } from '../../../orders/components/OrderStatusBadge';
import { OrderStatusHistory } from '../../../orders/components/OrderStatusHistory';
import { OrderTimeline } from '../../../orders/components/OrderTimeline';
import { PaymentStatusBadge } from '../../../payments/components/PaymentStatusBadge';
import { EscrowLedger } from '../../../payments/components/escrow/EscrowLedger';
import { EscrowStatusBadge } from '../../../payments/components/escrow/EscrowStatusBadge';
import { Price } from '../../../../components/ui/Price';
import { methodLabel } from '../../../payments/utils/receiptData';
import type { DisputeDetail } from '../../services/disputeService';

function Block({ title, children }: {title: string;children: ReactNode;}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>);

}

/**
 * The whole job or order, as it happened: request, photos, quote, timeline and history, messages,
 * reschedules, cancellation, arrival, payment and escrow. Read-only: these are the original records.
 */
export function DisputeThread({ d }: {d: DisputeDetail;}) {
  const { job, order, payment, escrow, dispute } = d;
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-xs font-semibold text-muted">
        <LockIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Read-only history. The original records and messages can’t be edited.
      </p>

      {job &&
      <>
          <Block title="Request">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge status={job.status} />
              <span className="text-sm text-muted">Requested {format(new Date(job.createdAt), 'd MMM yyyy')}</span>
            </div>
            <p className="mt-2 text-sm text-ink">{job.description}</p>
            <p className="mt-1 text-xs text-muted">
              {job.address.landmark}, {job.address.placeLabel}
            </p>
            {job.photos.length > 0 &&
          <div className="mt-3">
                <JobPhotos photos={job.photos} label="Photos the customer sent with the request" />
              </div>
          }
          </Block>
          {job.quote &&
        <Block title="Quote">
              <QuoteCard quote={job.quote} agreed={job.agreedPrice !== null} bookedFor={job.scheduledAt} />
            </Block>
        }
          <Block title="Timeline">
            <JobTimeline job={job} />
          </Block>
          <Block title="Status history">
            <JobStatusHistory job={job} viewer="customer" />
          </Block>
          {job.reschedules.length > 0 &&
        <Block title="Reschedules">
              <RescheduleHistory job={job} />
            </Block>
        }
          {job.arrival &&
        <Block title="Arrival record">
              <ArrivalNotice arrival={job.arrival} who={job.vendorName} />
            </Block>
        }
          {job.cancellation &&
        <Block title="Cancellation">
              <CancellationNotice job={job} cancellation={job.cancellation} viewer="customer" />
            </Block>
        }
        </>
      }

      {order &&
      <>
          <Block title="Order">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-muted">Placed {format(new Date(order.createdAt), 'd MMM yyyy')}</span>
            </div>
            <OrderItemsList order={order} />
          </Block>
          <Block title="Fulfilment">
            <OrderFulfilmentDetails order={order} />
          </Block>
          <Block title="Timeline">
            <OrderTimeline order={order} />
          </Block>
          <Block title="Status history">
            <OrderStatusHistory order={order} viewer="customer" />
          </Block>
        </>
      }

      <Block title="Messages between them (before the dispute)">
        {dispute.partyMessages.length === 0 ?
        <p className="text-sm text-muted">No messages.</p> :

        <ol className="space-y-2 text-sm">
            {dispute.partyMessages.map((m) =>
          <li key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 ${m.from === 'customer' ? 'bg-sand' : 'ml-auto bg-[#E3EEEC]'}`}>
                <p className="text-xs font-bold text-muted">
                  {m.from === 'customer' ? d.summary.customerName : d.summary.vendorName} · {format(new Date(m.at), 'd MMM, h:mm a')}
                </p>
                <p className="text-ink">{m.body}</p>
              </li>
          )}
          </ol>
        }
      </Block>

      <Block title="Payment and escrow">
        {payment ?
        <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Price amount={payment.amount} className="font-extrabold text-ink" />
              <PaymentStatusBadge status={payment.status} />
              {escrow && <EscrowStatusBadge status={escrow.status} />}
            </div>
            <p className="text-muted">
              {methodLabel(payment)} · <span className="font-mono">{payment.reference}</span>
              {payment.paidAt && ` · paid ${format(new Date(payment.paidAt), 'd MMM yyyy')}`}
            </p>
            {escrow ? <EscrowLedger escrow={escrow} showCommission open /> : <p className="text-muted">No escrow (cash, or not paid yet).</p>}
          </div> :

        <p className="text-sm text-muted">No payment recorded.</p>
        }
      </Block>
    </div>);

}
