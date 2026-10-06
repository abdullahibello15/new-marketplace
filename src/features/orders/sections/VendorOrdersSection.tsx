import { PackageIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SearchInput } from '../../../components/ui/SearchInput';
import { vendorAccount } from '../../../data/vendorPortal';
import { ORDER_ACTOR, VENDOR_ORDER_ROUTES } from '../constants';
import { OrderListItem } from '../components/OrderListItem';
import { OrderStatusFilter } from '../components/OrderStatusFilter';
import { useVendorOrderList } from '../hooks/useVendorOrderList';
import { useVendorOrders } from '../hooks/useVendorOrders';
import { orderActionHint } from '../utils/actionHints';

/** Vendor dashboard: this vendor's product orders, filterable by status. */
export function VendorOrdersSection() {
  const { orders, status, error, reload, newCount } = useVendorOrders();
  const list = useVendorOrderList(orders);

  function renderList() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (status === 'loading' && orders.length === 0) return <LoadingState label="Loading orders" rows={4} rowClassName="h-32" />;
    if (orders.length === 0) {
      return <EmptyState icon={PackageIcon} title="No orders yet" description="When customers order products from your shop, they show up here." />;
    }
    if (list.results.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="No orders match"
          description="Try a different name, order number or status."
          action={
          <Button variant="secondary" size="sm" onClick={list.clearFilters}>
              Clear filters
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
      <PageHeader title="Orders" subtitle={`${vendorAccount.businessName} · ${newCount} new`} />
      <PageContainer>
        <div className="space-y-3">
          <SearchInput value={list.query} onChange={list.setQuery} label="Search by customer or order number" placeholder="Search by customer or order #…" />
          {orders.length > 0 && <OrderStatusFilter value={list.statusFilter} onChange={list.setStatusFilter} counts={list.counts} total={orders.length} />}
        </div>
        <div className="mt-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted" aria-live="polite">
            {list.hasFilters ? `${list.results.length} of ${orders.length} shown` : 'All orders'}
          </h2>
          {list.hasFilters &&
          <button
            type="button"
            onClick={list.clearFilters}
            className="rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

              Clear filters
            </button>
          }
        </div>
        <div className="mt-3">{renderList()}</div>
      </PageContainer>
    </>);

}
