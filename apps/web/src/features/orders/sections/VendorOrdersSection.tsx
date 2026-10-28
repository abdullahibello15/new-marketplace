import { useTranslation } from 'react-i18next';
import { PackageIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SearchInput } from '../../../components/ui/SearchInput';
import { ORDER_ACTOR, VENDOR_ORDER_ROUTES } from '../constants';
import { OrderListItem } from '../components/OrderListItem';
import { OrderStatusFilter } from '../components/OrderStatusFilter';
import { useVendorOrderList } from '../hooks/useVendorOrderList';
import { useVendorOrders } from '../hooks/useVendorOrders';
import { orderActionHint } from '../utils/actionHints';
import { useCurrentVendor } from '../../auth/hooks/useCurrentVendor';

/** Vendor dashboard: this vendor's product orders, filterable by status. */
export function VendorOrdersSection() {
  const { t } = useTranslation('vendor');
  const { businessName } = useCurrentVendor();
  const { orders, status, error, reload, newCount } = useVendorOrders();
  const list = useVendorOrderList(orders);

  function renderList() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (status === 'loading' && orders.length === 0) return <LoadingState label={t('orders.loading')} rows={4} rowClassName="h-32" />;
    if (orders.length === 0) {
      return <EmptyState icon={PackageIcon} title={t('orders.emptyTitle')} description={t('orders.emptyText')} />;
    }
    if (list.results.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title={t('orders.noMatchTitle')}
          description={t('orders.noMatchText')}
          action={
          <Button variant="secondary" size="sm" onClick={list.clearFilters}>
              {t('requests.clearFilters')}
            </Button>
          } />);


    }
    return (
      <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {list.results.map((order) =>
        <li key={order.id}>
            <OrderListItem order={order} to={VENDOR_ORDER_ROUTES.order(order.id)} title={order.customerName} actionHint={orderActionHint(order, ORDER_ACTOR.Vendor)} />
          </li>
        )}
      </ul>);

  }

  return (
    <>
      <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle', { name: businessName, count: newCount })} />
      <PageContainer>
        <div className="space-y-3">
          <SearchInput value={list.query} onChange={list.setQuery} label={t('orders.search')} placeholder={t('orders.searchPlaceholder')} />
          {orders.length > 0 && <OrderStatusFilter value={list.statusFilter} onChange={list.setStatusFilter} counts={list.counts} total={orders.length} />}
        </div>
        <div className="mt-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted" aria-live="polite">
            {list.hasFilters ? t('requests.shown', { shown: list.results.length, total: orders.length }) : t('orders.all')}
          </h2>
          {list.hasFilters &&
          <button
            type="button"
            onClick={list.clearFilters}
            className="rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

              {t('requests.clearFilters')}
            </button>
          }
        </div>
        <div className="mt-3">{renderList()}</div>
      </PageContainer>
    </>);

}
