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
import { vendorAccount } from '../../data/vendorPortal';
import { useStockFilter } from '../../hooks/useStockFilter';
import { categoryLabel, matchesStockFilter } from '../../utils/products';
import { NotFound } from '../NotFound';
import type { Product, ProductCategory } from '../../types/marketplace';

export function Products() {
  const { getVendor, updateVendorProfile } = useVendors();
  const vendor = getVendor(vendorAccount.vendorId);
  const notice = (useLocation().state as {notice?: string;} | null)?.notice;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [deleted, setDeleted] = useState<{product: Product;index: number;} | null>(null);

  const products = useMemo(() => vendor?.products ?? [], [vendor]);
  const { stockFilter, setStockFilter, summary, counts } = useStockFilter(products);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!matchesStockFilter(p, stockFilter)) return false;
      if (!q) return true;
      return [p.name, p.description, categoryLabel(p.category)].some((s) => s.toLowerCase().includes(q));
    });
  }, [products, query, category, stockFilter]);

  if (!vendor) return <NotFound message="We couldn't find your vendor profile." />;

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
        title="My products"
        subtitle={`${products.length} ${products.length === 1 ? 'product' : 'products'} · ${availableCount} available`} />

      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <CatalogueTabs />

        <div role="status" className="empty:hidden">
          {deleted ?
          <p className="mt-4 flex items-center gap-3 rounded-xl bg-sand px-4 py-3 text-sm font-semibold text-ink">
              <span className="min-w-0 flex-1">Deleted {deleted.product.name}.</span>
              <button
              type="button"
              onClick={undoDelete}
              className="rounded font-bold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

                Undo
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
            <span className="sr-only">Search products</span>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your products…"
              className="w-full rounded-xl border border-line bg-white py-3 pl-12 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20" />

          </label>
          <label className="block lg:w-56">
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory | 'all')}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20">

              <option value="all">All categories ({products.length})</option>
              {productCategories.map((c) =>
              <option key={c.id} value={c.id}>
                  {c.label} ({countFor(c.id)})
                </option>
              )}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Link
              to="/pro/catalogue/products/import"
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-sand px-4 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

              <FileSpreadsheetIcon className="h-5 w-5" aria-hidden="true" />
              Import
            </Link>
            <Link
              to="/pro/catalogue/products/new"
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-clay px-5 py-3 text-[15px] font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-clay-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-cream">

              <PlusIcon className="h-5 w-5" aria-hidden="true" />
              Add product
            </Link>
          </div>
        </div>

        {products.length > 0 &&
        <div className="mt-4">
            <StockFilterTabs value={stockFilter} onChange={setStockFilter} counts={counts} />
          </div>
        }

        <div className="mt-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            {hasFilters ? `${results.length} of ${products.length} shown` : 'All products'}
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

              Clear filters
            </button>
          }
        </div>

        {products.length === 0 ?
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <PackageIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">No products yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Add products one by one, or import a spreadsheet to add many at once.</p>
          </div> :
        results.length === 0 ?
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <SearchXIcon className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 font-bold text-ink">{empty.emptyTitle}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">{empty.emptyHint}</p>
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
