import { useTranslation } from 'react-i18next';
import { useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { PRODUCT_ROUTES } from '../../constants';
import { usePlace } from '../../hooks/usePlace';
import { searchProducts } from '../../services/productCatalogueService';
import { productFiltersToSearchString } from '../../utils/productSearch';
import { ProductCard } from './ProductCard';
import type { ProductFilters } from '../../types';

const ROW_SIZE = 10;
const CARD = 'w-44 shrink-0 snap-start sm:w-52';

/**
 * A home page row ("Popular near Minna", "Under ₦5,000"…): products for some filters, scrolling sideways,
 * with "See all" to the catalogue with the same filters. Hidden when there's nothing to show.
 */
export function ProductRow({ title, filters }: {title: string;filters: ProductFilters;}) {
  const { t } = useTranslation('discovery');
  const headingId = useId();
  const { place } = usePlace();
  const fetchPage = useCallback(
    (page: number) => searchProducts({ filters, placeLga: place.lga, page, pageSize: ROW_SIZE }),
    [filters, place.lga]
  );
  const list = usePaginatedList(fetchPage);
  if (list.status === 'ready' && list.items.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-lg font-extrabold text-ink">{title}</h2>
        <Link
          to={`${PRODUCT_ROUTES.list}${productFiltersToSearchString(filters)}`}
          className="inline-flex shrink-0 items-center gap-1 rounded text-sm font-bold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          {t('products.seeAll')}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-3">
        {list.status === 'error' && list.items.length === 0 ?
        <ErrorState message={list.error ?? ''} onRetry={list.retry} /> :
        list.status === 'loading' ?
        <div role="status" className="flex gap-3 overflow-hidden">
            <span className="sr-only">{t('products.loading')}</span>
            {Array.from({ length: 5 }, (_, i) =>
          <div key={i} className={`${CARD} overflow-hidden rounded-2xl border border-line bg-white`} aria-hidden="true">
                <div className="aspect-square animate-pulse bg-sand" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-sand" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-sand" />
                </div>
              </div>
          )}
          </div> :

        <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 lg:-mx-1 lg:px-1">
            {list.items.map((l) =>
          <li key={`${l.shop.id}/${l.product.id}`} className={CARD}><ProductCard listing={l} /></li>
          )}
          </ul>
        }
      </div>
    </section>);

}
