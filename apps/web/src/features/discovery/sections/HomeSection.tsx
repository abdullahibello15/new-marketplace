import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, WrenchIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { PageContainer } from '../../../components/ui/PageContainer';
import { formatNaira } from '../../../utils/format';
import { useAuth } from '../../auth/hooks/useAuth';
import { CategoryGrid } from '../components/categories/CategoryGrid';
import { NearbyVendorFeed } from '../components/feed/NearbyVendorFeed';
import { PlaceChip } from '../components/location/PlaceChip';
import { ProductRow } from '../components/products/ProductRow';
import { PRODUCT_ROUTES, PRODUCT_SORT, SEARCH_ROUTE } from '../constants';
import { usePlace } from '../hooks/usePlace';
import { DEFAULT_PRODUCT_FILTERS } from '../utils/productSearch';
import type { ProductFilters } from '../types';

/** "Under ₦5,000": a budget row on the home page. */
const BUDGET_MAX = 5_000;

// Module-level, so each row's fetch stays memoised across renders.
const POPULAR: ProductFilters = { ...DEFAULT_PRODUCT_FILTERS, inStockOnly: true };
const BUDGET: ProductFilters = { ...DEFAULT_PRODUCT_FILTERS, inStockOnly: true, price: { min: null, max: BUDGET_MAX }, sort: PRODUCT_SORT.PriceLowToHigh };
const TOP_SHOPS: ProductFilters = { ...DEFAULT_PRODUCT_FILTERS, inStockOnly: true, sort: PRODUCT_SORT.TopRatedShop };

/**
 * The marketplace home (guests and customers): a banner, the service categories, product rows, then
 * services near the selected place. Search lives in the header.
 */
export function HomeSection() {
  const { t } = useTranslation('discovery');
  const { user } = useAuth();
  const { place } = usePlace();
  const firstName = user?.name.split(' ')[0];

  return (
    <PageContainer className="space-y-10 lg:space-y-12">
      <section aria-labelledby="home-hero-heading" className="grid overflow-hidden rounded-3xl bg-pine text-white md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4 p-6 sm:p-8 lg:p-10">
          <PlaceChip />
          <h1 id="home-hero-heading" className="text-3xl font-extrabold tracking-tight lg:text-[40px] lg:leading-tight">
            {firstName ? t('home.greeting', { name: firstName }) : t('home.heroTitle')}
          </h1>
          <p className="max-w-md text-[15px] text-white/85 lg:text-base">{t('home.heroText')}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to={PRODUCT_ROUTES.list} className={buttonClasses({ variant: 'highlight' })}>
              <ShoppingBagIcon className="h-4 w-4" aria-hidden="true" />
              {t('home.shopProducts')}
            </Link>
            <Link to={SEARCH_ROUTE} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <WrenchIcon className="h-4 w-4" aria-hidden="true" />
              {t('home.findService')}
            </Link>
          </div>
        </div>
        <img
          src="/landing/photos/market-rider-800.jpg"
          srcSet="/landing/photos/market-rider-480.jpg 480w, /landing/photos/market-rider-800.jpg 800w"
          sizes="(min-width: 768px) 45vw, 0px"
          alt=""
          className="hidden h-full min-h-[16rem] w-full object-cover md:block" />

      </section>

      <CategoryGrid />
      <ProductRow title={t('home.rowPopular', { place: place.name })} filters={POPULAR} />
      <ProductRow title={t('home.rowBudget', { amount: formatNaira(BUDGET_MAX) })} filters={BUDGET} />
      <ProductRow title={t('home.rowTopShops')} filters={TOP_SHOPS} />
      <NearbyVendorFeed />
    </PageContainer>);

}
