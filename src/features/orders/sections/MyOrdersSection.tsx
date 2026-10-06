import { Link } from 'react-router-dom';
import { PackageIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { ORDER_ACTOR, ORDER_ROUTES } from '../constants';
import { OrderListItem } from '../components/OrderListItem';
import { OrderStatusFilter } from '../components/OrderStatusFilter';
import { useMyOrders } from '../hooks/useMyOrders';
import { orderActionHint } from '../utils/actionHints';
import type { Order } from '../types';

const hintFor = (order: Order) => orderActionHint(order, ORDER_ACTOR.Customer);

/** The customer's product orders, one per vendor per checkout, with a status filter. */
export function MyOrdersSection() {
  const m = useMyOrders();
  const waiting = m.orders.filter((o) => hintFor(o) !== null).length;

  function renderList() {
    if (m.status === 'error') return <ErrorState message={m.error ?? ''} onRetry={m.reload} />;
    if (m.status === 'loading' && m.orders.length === 0) return <LoadingState label="Loading your orders" rows={3} rowClassName="h-32" />;
    if (m.orders.length === 0) {
      return (
        <EmptyState
          icon={PackageIcon}
          title="No orders yet"
          description="Add products to your cart from a vendor’s shop. Your orders show up here so you can track them."
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Browse vendors
            </Link>
          } />);


    }
    if (m.visible.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="No orders with this status"
          action={
          <Button variant="secondary" size="sm" onClick={() => m.setFilter('all')}>
              Show all orders
            </Button>
          } />);


    }
    return (
      <ul className="grid gap-3 md:grid-cols-2 lg:gap-4">
        {m.visible.map((order) =>
        <li key={order.id}>
            <OrderListItem order={order} to={ORDER_ROUTES.order(order.id)} title={order.vendorName} actionHint={hintFor(order)} />
          </li>
        )}
      </ul>);

  }

  return (
    <>
      <PageHeader
        title="My Orders"
        subtitle={waiting ? `${waiting} ${waiting === 1 ? 'order needs' : 'orders need'} your attention` : 'Track the products you’ve ordered'} />

      <PageContainer className="space-y-4">
        {m.orders.length > 0 && <OrderStatusFilter value={m.filter} onChange={m.setFilter} counts={m.counts} total={m.orders.length} />}
        {renderList()}
      </PageContainer>
    </>);

}
