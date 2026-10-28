import { useTranslation } from 'react-i18next';
import React from 'react';
import { PackageSearchIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { errorText } from '../../../../components/vendor/formStyles';
import { ProductCard } from './ProductCard';
import type { PaginatedStatus } from '../../../../hooks/usePaginatedList';
import type { ProductListing } from '../../types';

const SKELETON_COUNT = 4;
const GRID = 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

interface ProductResultsProps {
  items: ProductListing[];
  total: number;
  status: PaginatedStatus;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}

/** A paginated product grid with skeleton, empty, error and "Load more" states (the catalogue and the home row). */
export function ProductResults({ items, total, status, error, hasMore, onLoadMore, onRetry, emptyTitle, emptyDescription, emptyAction }: ProductResultsProps) {
  const { t } = useTranslation('discovery');

  if (status === 'loading') {
    return (
      <div role="status" className={GRID}>
        <span className="sr-only">{t('products.loading')}</span>
        {Array.from({ length: SKELETON_COUNT }, (_, i) =>
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white" aria-hidden="true">
            <div className="aspect-square animate-pulse bg-sand" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-1/2 animate-pulse rounded bg-sand" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-sand" />
            </div>
          </div>
        )}
      </div>);

  }
  if (status === 'error' && items.length === 0) return <ErrorState message={error ?? ''} onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState icon={PackageSearchIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div>
      <p className="sr-only" aria-live="polite">{t('products.showing', { shown: items.length, total })}</p>
      <ul className={GRID}>
        {items.map((l) =>
        <li key={`${l.shop.id}/${l.product.id}`}><ProductCard listing={l} /></li>
        )}
      </ul>
      <div className="mt-5 flex flex-col items-center gap-2">
        {status === 'error' && <p role="alert" className={errorText}>{error}</p>}
        {status === 'error' ?
        <Button variant="outline" onClick={onRetry}>{t('common:action.retry')}</Button> :
        hasMore ?
        <Button variant="outline" onClick={onLoadMore} loading={status === 'loadingMore'}>{t('results.loadMore')}</Button> :
        null}
      </div>
    </div>);

}
