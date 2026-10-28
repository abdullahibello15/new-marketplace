import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('jobs');
  const m = useMyOrders();
  const waiting = m.orders.filter((o) => hintFor(o) !== null).length;

  function renderList() {
    if (m.status === 'error') return <ErrorState message={m.error ?? ''} onRetry={m.reload} />;
    if (m.status === 'loading' && m.orders.length === 0) return <LoadingState label={t('order.mine.loading')} rows={3} rowClassName="h-32" />;
    if (m.orders.length === 0) {
      return (
        <EmptyState
          icon={PackageIcon}
          title={t('order.mine.emptyTitle')}
          description={t('order.mine.emptyText')}
          action={
          <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {t('order.mine.browse')}
            </Link>
          } />);


    }
    if (m.visible.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title={t('order.mine.noneWithStatus')}
          action={
          <Button variant="secondary" size="sm" onClick={() => m.setFilter('all')}>
              {t('order.mine.showAll')}
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
        title={t('order.mine.title')}
        subtitle={waiting ? t('order.mine.waiting', { count: waiting }) : t('order.mine.subtitle')} />

      <PageContainer className="space-y-4">
        {m.orders.length > 0 && <OrderStatusFilter value={m.filter} onChange={m.setFilter} counts={m.counts} total={m.orders.length} />}
        {renderList()}
      </PageContainer>
    </>);

}
