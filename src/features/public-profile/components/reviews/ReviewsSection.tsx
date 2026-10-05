import { MessageSquareIcon } from 'lucide-react';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { RatingSummary } from '../../../vendor-dashboard/components/reviews/RatingSummary';
import { PROFILE_SECTION_ID, REVIEW_SORT_OPTIONS } from '../../constants';
import { useVendorReviews } from '../../hooks/useVendorReviews';
import { PageSection } from '../PageSection';
import { ReviewList } from './ReviewList';

export function ReviewsSection({ vendorId, vendorName }: {vendorId: string;vendorName: string;}) {
  const { summary, list, sort, setSort } = useVendorReviews(vendorId);
  const stats = summary.data;
  const hasReviews = Boolean(stats && stats.total > 0);

  function renderBody() {
    if (summary.status === 'error') return <ErrorState message={summary.error ?? ''} onRetry={summary.reload} />;
    if (!stats) return <LoadingState label="Loading reviews" rows={2} rowClassName="h-32" />;
    if (!hasReviews) {
      return <EmptyState icon={MessageSquareIcon} title="No reviews yet" description={`Reviews appear here after customers finish a job with ${vendorName}.`} />;
    }
    return (
      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="md:sticky md:top-6 md:self-start">
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
      title={stats ? `Reviews · ${stats.total}` : 'Reviews'}
      action={hasReviews ? <SegmentedControl label="Sort reviews" options={REVIEW_SORT_OPTIONS} value={sort} onChange={setSort} /> : undefined}>

      {renderBody()}
    </PageSection>);

}
