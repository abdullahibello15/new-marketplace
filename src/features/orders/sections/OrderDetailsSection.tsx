import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useAuth } from '../../auth/hooks/useAuth';
import { vendorProfilePath } from '../../public-profile/constants';
import { orderStatusDescription } from '../../../i18n/labels';
import { ORDER_ACTOR, ORDER_ROUTES, ORDER_STATUS_META } from '../constants';
import { CustomerOrderPanel } from '../components/customer/CustomerOrderPanel';
import { OrderFulfilmentDetails } from '../components/OrderFulfilmentDetails';
import { OrderItemsList } from '../components/OrderItemsList';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderStatusHistory } from '../components/OrderStatusHistory';
import { OrderTimeline } from '../components/OrderTimeline';
import { useOrder } from '../hooks/useOrder';


/** Customer's order page: timeline for the order's path, items, pickup/delivery details, actions and history. */
export function OrderDetailsSection() {
  const { t } = useTranslation('jobs');
  const BACK = { to: ORDER_ROUTES.myOrders, label: t('order.page.back') };
  const { user } = useAuth();
  const { orderId = '' } = useParams();
  const { order, notFound, status, error, reload, replace } = useOrder(orderId);

  if (status === 'error') {
    return (
      <>
        <PageHeader title={t('order.page.title', { id: orderId })} backTo={BACK} />
        <PageContainer width="narrow">
          <ErrorState message={error ?? ''} onRetry={reload} />
        </PageContainer>
      </>);

  }
  // An order that isn't this customer's is treated as not found.
  if (notFound || order && order.customerId !== user?.id) {
    return (
      <>
        <PageHeader title={t('order.page.notFoundTitle')} backTo={BACK} />
        <PageContainer width="narrow">
          <EmptyState
            icon={SearchXIcon}
            title={t('order.page.notFoundHeading')}
            action={
            <Link to={ORDER_ROUTES.myOrders} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                {t('order.page.backToMine')}
              </Link>
            } />

        </PageContainer>
      </>);

  }
  if (!order) {
    return (
      <>
        <PageHeader title={t('order.page.title', { id: orderId })} backTo={BACK} />
        <PageContainer width="narrow">
          <LoadingState label={t('order.page.loading')} rows={3} rowClassName="h-40" />
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={t('order.page.title', { id: order.id })} subtitle={t('order.page.subtitle', { name: order.vendorName, ref: order.checkoutRef })} backTo={BACK}>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm text-white/85">{orderStatusDescription(order.status, ORDER_STATUS_META[order.status].description)}</span>
        </div>
      </PageHeader>
      <PageContainer className="space-y-5">
        <section aria-label={t('order.page.progress')} className="rounded-2xl border border-line bg-white p-4 lg:p-6">
          <OrderTimeline order={order} />
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <OrderItemsList order={order} />
            <OrderFulfilmentDetails order={order} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start" aria-label={t('order.page.aside')}>
            <CustomerOrderPanel order={order} onUpdated={replace} />
            <OrderStatusHistory order={order} viewer={ORDER_ACTOR.Customer} />
            <Link to={vendorProfilePath(order.vendorId)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
              {t('order.page.viewVendor', { name: order.vendorName })}
            </Link>
          </aside>
        </div>
      </PageContainer>
    </>);

}
