import React from 'react';
import { StoreIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { errorText } from '../../../../components/vendor/formStyles';
import { VendorListingCard } from './VendorListingCard';
import { VendorListingSkeleton } from './VendorListingSkeleton';
import type { PaginatedStatus } from '../../../../hooks/usePaginatedList';
import type { VendorListing } from '../../types';

const SKELETON_COUNT = 3;

interface VendorListingResultsProps {
  items: VendorListing[];
  total: number;
  status: PaginatedStatus;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  /** One card per row, e.g. beside the map. */
  singleColumn?: boolean;
  /** Card to ring, e.g. the vendor selected on the map. */
  highlightedId?: string | null;
  /** Reports which card the pointer or keyboard focus is on, so the map can highlight its marker. */
  onItemHover?: (id: string | null) => void;
}

/** A paginated vendor list with skeleton, empty, error and "Load more" states. Used by the feed and search. */
export function VendorListingResults(props: VendorListingResultsProps) {
  const { items, total, status, error, hasMore, onLoadMore, onRetry, highlightedId, onItemHover } = props;
  const grid = props.singleColumn ? 'grid gap-3' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3';

  if (status === 'loading') {
    return (
      <div role="status" className={grid}>
        <span className="sr-only">Loading vendors…</span>
        {Array.from({ length: SKELETON_COUNT }, (_, i) =>
        <VendorListingSkeleton key={i} />
        )}
      </div>);

  }
  if (status === 'error' && items.length === 0) return <ErrorState message={error ?? ''} onRetry={onRetry} />;
  if (items.length === 0) {
    return <EmptyState icon={StoreIcon} title={props.emptyTitle} description={props.emptyDescription} action={props.emptyAction} />;
  }

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Showing {items.length} of {total} vendors
      </p>
      <ul className={grid} onMouseLeave={onItemHover && (() => onItemHover(null))}>
        {items.map((listing) =>
        <li
          key={listing.id}
          data-vendor-id={listing.id}
          className="scroll-mt-24"
          onMouseEnter={onItemHover && (() => onItemHover(listing.id))}
          onFocus={onItemHover && (() => onItemHover(listing.id))}
          onBlur={onItemHover && (() => onItemHover(null))}>

            <VendorListingCard listing={listing} highlighted={listing.id === highlightedId} />
          </li>
        )}
      </ul>

      <div className="mt-5 flex flex-col items-center gap-2">
        {status === 'error' &&
        <p role="alert" className={errorText}>
            {error}
          </p>
        }
        {status === 'error' ?
        <Button variant="outline" onClick={onRetry}>
            Try again
          </Button> :
        hasMore ?
        <Button variant="outline" onClick={onLoadMore} loading={status === 'loadingMore'}>
            Load more
          </Button> :

        <p className="text-sm text-muted">
            {total === 1 ? 'That’s the only vendor' : `That’s all ${total} vendors`} here.
          </p>
        }
      </div>
    </div>);

}
