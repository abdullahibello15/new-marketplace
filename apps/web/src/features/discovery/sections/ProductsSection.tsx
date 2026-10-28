import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { productCategoryLabel } from '../../../i18n/labels';
import { Button } from '../../../components/ui/Button';
import { PageContainer } from '../../../components/ui/PageContainer';
import { categoryLabel } from '../../../utils/products';
import { ProductFilterBar } from '../components/products/ProductFilterBar';
import { ProductResults } from '../components/products/ProductResults';
import { useProductSearch } from '../hooks/useProductSearch';
import { usePlace } from '../hooks/usePlace';
import { DEFAULT_PRODUCT_FILTERS } from '../utils/productSearch';

/**
 * /products — the public product catalogue: a grid (2 across on phones, up to 5 on wide screens) with
 * category, price, stock and sort in a bar above it; all in the URL. The search text comes from the
 * header search. Open to guests; the cart is kept on this device and sign-in is asked for at checkout.
 */
export function ProductsSection() {
  const { t } = useTranslation('discovery');
  const { place } = usePlace();
  const { filters, list, setFilters, activeCount, clearAll } = useProductSearch();
  const title = filters.category ? productCategoryLabel(filters.category, categoryLabel(filters.category)) : t('products.title');
  const filtered = Boolean(filters.query) || activeCount > 0;

  return (
    <PageContainer className="space-y-5">
      <nav aria-label={t('products.breadcrumb')} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="rounded hover:text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">{t('profile.home')}</Link></li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-semibold text-ink">{title}</li>
        </ol>
      </nav>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
          {filters.query ? t('products.resultsFor', { query: filters.query }) : title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {list.status === 'ready' ? t('products.count', { count: list.total }) : t('products.subtitle', { place: place.name })}
        </p>
      </div>

      <ProductFilterBar filters={filters} onChange={setFilters} activeCount={activeCount} onClear={clearAll} />

      <ProductResults
        items={list.items}
        total={list.total}
        status={list.status}
        error={list.error}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        onRetry={list.retry}
        emptyTitle={t('products.emptyTitle')}
        emptyDescription={filtered ? t('products.emptyFiltered') : t('products.emptyText')}
        emptyAction={
        filtered &&
        <Button variant="secondary" size="sm" onClick={() => setFilters({ ...DEFAULT_PRODUCT_FILTERS, sort: filters.sort })}>
            {t('products.clearSearch')}
          </Button>
        } />

    </PageContainer>);

}
