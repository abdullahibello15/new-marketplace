import { useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { listReviews, replyToReview, reportReview } from '../services/reviewService';
import { computeReviewStats } from '../utils/reviews';
import type { RatingFilter, ReportReviewInput, Review } from '../types';

const EMPTY: Review[] = [];

export function useReviews() {
  const { data, status, error, reload, setData } = useAsyncData(listReviews);
  const toast = useToast();
  const reviews = data ?? EMPTY;
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Review | null>(null);

  const stats = useMemo(() => computeReviewStats(reviews), [reviews]);

  const visible = useMemo(
    () =>
    reviews.
    filter((r) => ratingFilter === 'all' || r.rating === ratingFilter).
    sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, ratingFilter]
  );

  const replace = (updated: Review) => setData((prev) => prev.map((r) => r.id === updated.id ? updated : r));

  /** Resolves true on success so the form knows whether to close. */
  async function reply(id: string, body: string): Promise<boolean> {
    try {
      replace(await replyToReview(id, body));
      setReplyingId(null);
      toast.success('Reply posted. It’s now public on your profile.');
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  async function report(input: ReportReviewInput): Promise<boolean> {
    if (!reportTarget) return false;
    try {
      replace(await reportReview(reportTarget.id, input));
      setReportTarget(null);
      toast.success('Thanks for reporting it. Our team will check it within 2 working days.');
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  return {
    reviews,
    visible,
    stats,
    status,
    error,
    reload,
    ratingFilter,
    setRatingFilter,
    replyingId,
    startReply: setReplyingId,
    cancelReply: () => setReplyingId(null),
    reply,
    reportTarget,
    openReport: setReportTarget,
    closeReport: () => setReportTarget(null),
    report
  };
}
