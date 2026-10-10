import { useTranslation } from 'react-i18next';
import { productCategoryLabel, stockFilterText } from '../../i18n/labels';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2Icon, FileSpreadsheetIcon, PackageIcon, PlusIcon, SearchIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { CatalogueTabs } from '../../components/vendor/CatalogueTabs';
import { ProductListItem } from '../../components/vendor/ProductListItem';
import { StockFilterTabs } from '../../components/vendor/StockFilterTabs';
import { StockSummary } from '../../components/vendor/StockSummary';
import { useVendors } from '../../contexts/VendorsContext';
import { productCategories } from '../../data/productCategories';
import { stockFilters } from '../../data/stockFilters';
import { useStockFilter } from '../../hooks/useStockFilter';
import { categoryLabel, matchesStockFilter } from '../../utils/products';
import { PLAN_LIMIT } from '../../features/vendor-dashboard/constants';
import { UpgradePrompt } from '../../features/vendor-dashboard/components/subscription/UpgradePrompt';
import { usePlanLimits } from '../../features/vendor-dashboard/hooks/usePlanLimits';
import { NotFound } from '../NotFound';
import type { Product, ProductCategory } from '../../types/marketplace';
import { useCurrentVendor } from '../../features/auth/hooks/useCurrentVendor';

export function Products() {
  const { t } = useTranslation('vendor');
  const { getVendor, updateVendorProfile } = useVendors();
  const { vendorId } = useCurrentVendor();
  const vendor = getVendor(vendorId);
  const notice = (useLocation().state as {notice?: string;} | null)?.notice;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [deleted, setDeleted] = useState<{product: Product;index: number;} | null>(null);

  const products = useMemo(() => vendor?.products ?? [], [vendor]);
  const limits = usePlanLimits();
  const atLimit = limits.reached(PLAN_LIMIT.Products, products.length);
  const { stockFilter, setStockFilter, summary, counts } = useStockFilter(products);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!matchesStockFilter(p, stockFilter)) return false;
      if (!q) return true;
      return [p.name, p.description, categoryLabel(p.category), productCategoryLabel(p.category, categoryLabel(p.category))].some((s) => s.toLowerCase().includes(q));
    });
  }, [products, query, category, stockFilter]);

  if (!vendor) return <NotFound message={t('profile.notFoundTitle')} />;

  const save = (next: Product[]) => updateVendorProfile(vendor.id, { products: next });
  const countFor = (id: ProductCategory) => products.filter((p) => p.category === id).length;
  const availableCount = products.filter((p) => p.available).length;
  const hasFilters = Boolean(query.trim()) || category !== 'all' || stockFilter !== 'all';
  // With only a stock filter on, an empty list is good news, so say so instead of "No products match".
  const onlyStockFilter = stockFilter !== 'all' && !query.trim() && category === 'all';
  const empty = stockFilters.find((f) => f.id === (onlyStockFilter ? stockFilter : 'all')) ?? stockFilters[0];

  const setStock = (id: string, stock: number) => save(products.map((x) => x.id === id ? { ...x, stock } : x));

  function remove(product: Product) {
    setDeleted({ product, index: products.indexOf(product) });
    save(products.filter((p) => p.id !== product.id));
  }

  function undoDelete() {
    if (!deleted) return;
    const next = [...products];
    next.splice(Math.min(deleted.index, next.length), 0, deleted.product);
    save(next);
    setDeleted(null);
  }

  return (
    <>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle', { products: t('products.count', { count: products.length }), available: availableCount })} />

      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <CatalogueTabs />

        <div role="status" className="empty:hidden">
          {deleted ?
          <p className="mt-4 flex items-center gap-3 rounded-xl bg-sand px-4 py-3 text-sm font-semibold text-ink">
              <span className="min-w-0 flex-1">{t('products.deleted', { name: deleted.product.name })}</span>
              <button
              type="button"
              onClick={undoDelete}
              className="rounded font-bold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

                {t('products.undo')}
              </button>
            </p> :
          notice ?
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm font-semibold text-pine">
              <CheckCircle2Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {notice}
            </p> :
          null}
        </div>

        {products.length > 0 && <StockSummary summary={summary} />}

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">{t('products.search')}</span>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('products.searchPlaceholder')}
              className="w-full rounded-xl border border-line bg-white py-3 pl-12 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20" />

          </label>
          <label className="block lg:min-w-[14rem]">
            <span className="sr-only">{t('products.filterCategory')}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory | 'all')}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20">

              <option value="all">{t('products.allCategories', { count: products.length })}</option>
              {productCategories.map((c) =>
              <option key={c.id} value={c.id}>
                  {productCategoryLabel(c.id, c.label)} ({countFor(c.id)})
                </option>
              )}
            </select>
          </label>
          {!atLimit &&
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Link
              to="/pro/catalogue/products/import"
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-sand px-4 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

              <FileSpreadsheetIcon className="h-5 w-5" aria-hidden="true" />
              {t('products.import')}
            </Link>
            <Link
              to="/pro/catalogue/products/new"
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-clay px-5 py-3 text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-clay-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-cream">

              <PlusIcon className="h-5 w-5" aria-hidden="true" />
              {t('products.add')}
            </Link>
          </div>
          }
        </div>
        {atLimit && limits.plan &&
        <div className="mt-4">
            <UpgradePrompt limitKey={PLAN_LIMIT.Products} plan={limits.plan} />
          </div>
        }

        {products.length > 0 &&
        <div className="mt-4">
            <StockFilterTabs value={stockFilter} onChange={setStockFilter} counts={counts} />
          </div>
        }

        <div className="mt-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            {hasFilters ? t('requests.shown', { shown: results.length, total: products.length }) : t('products.all')}
          </h2>
          {hasFilters &&
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setStockFilter('all');
            }}
            className="rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

              {t('requests.clearFilters')}
            </button>
          }
        </div>

        {products.length === 0 ?
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <PackageIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">{t('products.none')}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">{t('products.noneText')}</p>
          </div> :
        results.length === 0 ?
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <SearchXIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">{stockFilterText(empty.id, 'emptyTitle', empty.emptyTitle)}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">{stockFilterText(empty.id, 'emptyHint', empty.emptyHint)}</p>
          </div> :

        <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:gap-4">
            {results.map((p) =>
          <ProductListItem
            key={p.id}
            product={p}
            onToggleAvailable={(available) => save(products.map((x) => x.id === p.id ? { ...x, available } : x))}
            onStockChange={(stock) => setStock(p.id, stock)}
            onDelete={() => remove(p)} />

          )}
          </ul>
        }
      </div>
    </>);

}
