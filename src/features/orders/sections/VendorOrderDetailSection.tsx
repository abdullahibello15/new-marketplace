import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { FULFILMENT_METHOD_LABELS, ORDER_ACTOR, ORDER_STATUS_META, VENDOR_ORDER_ROUTES } from '../constants';
import { OrderFulfilmentDetails } from '../components/OrderFulfilmentDetails';
import { OrderItemsList } from '../components/OrderItemsList';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderStatusHistory } from '../components/OrderStatusHistory';
import { OrderTimeline } from '../components/OrderTimeline';
import { VendorOrderPanel } from '../components/vendor/VendorOrderPanel';
import { useVendorOrders } from '../hooks/useVendorOrders';

const BACK = { to: VENDOR_ORDER_ROUTES.orders, label: 'Orders' };

/** Vendor's view of one order: items, pickup or delivery details, and the next allowed step. */
export function VendorOrderDetailSection() {
  const { orderId } = useParams();
  const { orders, status, error, reload, replaceOrder } = useVendorOrders();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <>
        <PageHeader title="Order" backTo={BACK} />
        <PageContainer width="narrow">
          {status === 'error' ?
          <ErrorState message={error ?? ''} onRetry={reload} /> :
          status === 'loading' ?
          <LoadingState label="Loading order" rows={1} rowClassName="h-80" /> :

          <EmptyState
            icon={SearchXIcon}
            title="We couldn’t find that order"
            description="It may belong to another shop, or the link is wrong."
            action={
            <Link to={BACK.to} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Back to orders
                </Link>
            } />

          }
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={order.customerName} subtitle={`Order #${order.id} · ${FULFILMENT_METHOD_LABELS[order.method]}`} backTo={BACK}>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm text-white/85">{ORDER_STATUS_META[order.status].description}</span>
        </div>
      </PageHeader>
      <PageContainer className="space-y-5">
        <section aria-label="Progress" className="rounded-2xl border border-line bg-white p-4 lg:p-6">
          <OrderTimeline order={order} />
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <OrderItemsList order={order} />
            <OrderFulfilmentDetails order={order} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start" aria-label="Actions and activity">
            <VendorOrderPanel order={order} onUpdated={replaceOrder} />
            <OrderStatusHistory order={order} viewer={ORDER_ACTOR.Vendor} />
          </aside>
        </div>
      </PageContainer>
    </>);

}
