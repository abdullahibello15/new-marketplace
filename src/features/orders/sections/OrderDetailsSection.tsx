import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { CURRENT_CUSTOMER_ID } from '../../jobs/constants';
import { vendorProfilePath } from '../../public-profile/constants';
import { ORDER_ACTOR, ORDER_ROUTES, ORDER_STATUS_META } from '../constants';
import { CustomerOrderPanel } from '../components/customer/CustomerOrderPanel';
import { OrderFulfilmentDetails } from '../components/OrderFulfilmentDetails';
import { OrderItemsList } from '../components/OrderItemsList';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderStatusHistory } from '../components/OrderStatusHistory';
import { OrderTimeline } from '../components/OrderTimeline';
import { useOrder } from '../hooks/useOrder';

const BACK = { to: ORDER_ROUTES.myOrders, label: 'My Orders' };

/** Customer's order page: timeline for the order's path, items, pickup/delivery details, actions and history. */
export function OrderDetailsSection() {
  const { orderId = '' } = useParams();
  const { order, notFound, status, error, reload, replace } = useOrder(orderId);

  if (status === 'error') {
    return (
      <>
        <PageHeader title={`Order #${orderId}`} backTo={BACK} />
        <PageContainer width="narrow">
          <ErrorState message={error ?? ''} onRetry={reload} />
        </PageContainer>
      </>);

  }
  // An order that isn't this customer's is treated as not found.
  if (notFound || order && order.customerId !== CURRENT_CUSTOMER_ID) {
    return (
      <>
        <PageHeader title="Order not found" backTo={BACK} />
        <PageContainer width="narrow">
          <EmptyState
            icon={SearchXIcon}
            title="We couldn’t find that order"
            action={
            <Link to={ORDER_ROUTES.myOrders} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Back to My Orders
              </Link>
            } />

        </PageContainer>
      </>);

  }
  if (!order) {
    return (
      <>
        <PageHeader title={`Order #${orderId}`} backTo={BACK} />
        <PageContainer width="narrow">
          <LoadingState label="Loading order" rows={3} rowClassName="h-40" />
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={`Order #${order.id}`} subtitle={`${order.vendorName} · checkout ${order.checkoutRef}`} backTo={BACK}>
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
            <CustomerOrderPanel order={order} onUpdated={replace} />
            <OrderStatusHistory order={order} viewer={ORDER_ACTOR.Customer} />
            <Link to={vendorProfilePath(order.vendorId)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
              View {order.vendorName}
            </Link>
          </aside>
        </div>
      </PageContainer>
    </>);

}
