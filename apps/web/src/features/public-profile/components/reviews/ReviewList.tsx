import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { errorText } from '../../../../components/vendor/formStyles';
import { PublicReviewCard } from './PublicReviewCard';
import type { PaginatedStatus } from '../../../../hooks/usePaginatedList';
import type { PublicReview } from '../../types';

interface ReviewListProps {
  items: PublicReview[];
  total: number;
  status: PaginatedStatus;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  vendorName: string;
}

export function ReviewList({ items, total, status, error, hasMore, onLoadMore, onRetry, vendorName }: ReviewListProps) {
  const { t } = useTranslation('discovery');
  if (status === 'loading') return <LoadingState label={t('profile.loadingReviews')} rows={3} rowClassName="h-32" />;
  if (status === 'error' && items.length === 0) return <ErrorState message={error ?? ''} onRetry={onRetry} />;

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {t('profile.showingReviews', { shown: items.length, total })}
      </p>
      <ul className="space-y-3">
        {items.map((r) =>
        <li key={r.id}>
            <PublicReviewCard review={r} vendorName={vendorName} />
          </li>
        )}
      </ul>
      <div className="mt-4 flex flex-col items-center gap-2">
        {status === 'error' &&
        <p role="alert" className={errorText}>
            {error}
          </p>
        }
        {status === 'error' ?
        <Button variant="outline" onClick={onRetry}>
            {t('common:action.retry')}
          </Button> :
        hasMore ?
        <Button variant="outline" onClick={onLoadMore} loading={status === 'loadingMore'}>
            {t('profile.loadMoreReviews')}
          </Button> :

        items.length > 0 && <p className="text-sm text-muted">{t('profile.allReviews', { count: total })}</p>
        }
      </div>
    </div>);

}
