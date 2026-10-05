import { MessageSquareIcon, StarIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { RatingFilter } from '../components/reviews/RatingFilter';
import { RatingSummary } from '../components/reviews/RatingSummary';
import { ReportReviewDialog } from '../components/reviews/ReportReviewDialog';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { useReviews } from '../hooks/useReviews';

export function ReviewsSection() {
  const r = useReviews();
  const unanswered = r.reviews.filter((review) => !review.reply).length;

  function renderBody() {
    if (r.status === 'error') return <ErrorState message={r.error ?? ''} onRetry={r.reload} />;
    if (r.status === 'loading' && r.reviews.length === 0) return <LoadingState label="Loading reviews" rows={3} rowClassName="h-36" />;
    if (r.reviews.length === 0) {
      return <EmptyState icon={MessageSquareIcon} title="No reviews yet" description="Customers can review you after a job is completed." />;
    }
    return (
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <RatingSummary stats={r.stats} />
        </div>
        <div className="min-w-0 space-y-4">
          <RatingFilter value={r.ratingFilter} onChange={r.setRatingFilter} stats={r.stats} />
          {r.visible.length === 0 ?
          <EmptyState
            icon={StarIcon}
            title={`No ${r.ratingFilter}-star reviews`}
            action={
            <Button variant="secondary" size="sm" onClick={() => r.setRatingFilter('all')}>
                  Show all reviews
                </Button>
            } /> :


          <ul className="space-y-3" aria-label="Reviews">
              {r.visible.map((review) =>
            <li key={review.id}>
                  <ReviewCard
                review={review}
                replying={r.replyingId === review.id}
                onStartReply={r.startReply}
                onCancelReply={r.cancelReply}
                onReply={r.reply}
                onReport={r.openReport} />

                </li>
            )}
            </ul>
          }
        </div>
      </div>);

  }

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle={r.reviews.length ? `${r.stats.average.toFixed(1)} average · ${unanswered} without a reply` : undefined} />

      <PageContainer>{renderBody()}</PageContainer>
      <ReportReviewDialog review={r.reportTarget} onSubmit={r.report} onClose={r.closeReport} />
    </>);

}
