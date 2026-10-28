import { useTranslation } from 'react-i18next';
import { MessageSquareIcon } from 'lucide-react';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { RatingSummary } from '../../../vendor-dashboard/components/reviews/RatingSummary';
import { PROFILE_SECTION_ID, REVIEW_SORT_OPTIONS } from '../../constants';
import type { ReviewSort } from '../../types';
import { useVendorReviews } from '../../hooks/useVendorReviews';
import { PageSection } from '../PageSection';
import { ReviewList } from './ReviewList';

export function ReviewsSection({ vendorId, vendorName }: {vendorId: string;vendorName: string;}) {
  const { t } = useTranslation('discovery');
  const { summary, list, sort, setSort } = useVendorReviews(vendorId);
  const sortOptions = REVIEW_SORT_OPTIONS.map((o): {id: ReviewSort;label: string;} => ({ id: o.id, label: t(`profile.sort.${o.id}`) }));
  const stats = summary.data;
  const hasReviews = Boolean(stats && stats.total > 0);

  function renderBody() {
    if (summary.status === 'error') return <ErrorState message={summary.error ?? ''} onRetry={summary.reload} />;
    if (!stats) return <LoadingState label={t('profile.loadingReviews')} rows={2} rowClassName="h-32" />;
    if (!hasReviews) {
      return <EmptyState icon={MessageSquareIcon} title={t('profile.noReviews')} description={t('profile.noReviewsText', { name: vendorName })} />;
    }
    return (
      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="md:sticky md:top-24 lg:top-32 md:self-start">
          {/* Same rating breakdown the vendor sees on their dashboard. */}
          <RatingSummary stats={stats} />
        </div>
        <ReviewList
          items={list.items}
          total={list.total}
          status={list.status}
          error={list.error}
          hasMore={list.hasMore}
          onLoadMore={list.loadMore}
          onRetry={list.retry}
          vendorName={vendorName} />

      </div>);

  }

  return (
    <PageSection
      id={PROFILE_SECTION_ID.Reviews}
      title={stats ? t('profile.reviewsCount', { count: stats.total }) : t('profile.reviews')}
      action={hasReviews ? <SegmentedControl label={t('profile.sortReviews')} options={sortOptions} value={sort} onChange={setSort} /> : undefined}>

      {renderBody()}
    </PageSection>);

}
