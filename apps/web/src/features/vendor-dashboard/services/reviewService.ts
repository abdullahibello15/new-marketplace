import i18n from '../../../i18n';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { mockReviews } from '../mock/reviews';
import { isReviewRemoved } from '../../public-profile/services/reviewModeration';
import { reportReviewSchema, reviewReplySchema } from '../schemas';
import type { ReportReviewInput, Review } from '../types';

let reviews: Review[] = structuredClone(mockReviews);

function findReview(id: string): Review {
  const review = reviews.find((r) => r.id === id);
  if (!review) throw new ApiError(i18n.t('vendor:error.reviewGone'), 404);
  return review;
}

function save(updated: Review): Review {
  reviews = reviews.map((r) => r.id === updated.id ? updated : r);
  return updated;
}

/** GET /vendor/reviews — reviews removed by Gwani's moderators are left out. */
export function listReviews(): Promise<Review[]> {
  return mockResponse(() => reviews.filter((r) => !isReviewRemoved(r.id)));
}

/** Reviews the vendor reported (the existing "Report review" action), for Gwani's moderation queue. */
export const reportedReviewsNow = (): readonly Review[] => reviews.filter((r) => r.report !== null);

/** POST /vendor/reviews/:id/reply { body }. One reply per review. */
export function replyToReview(id: string, body: string): Promise<Review> {
  return mockResponse(() => {
    const review = findReview(id);
    if (review.reply) throw new ApiError(i18n.t('vendor:error.replied'), 409);
    // Validate again on the "server": never trust the client.
    const parsed = reviewReplySchema.safeParse({ body });
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? i18n.t('vendor:error.replyInvalid'), 400);
    return save({ ...review, reply: { body: parsed.data.body, createdAt: new Date().toISOString() } });
  });
}

/** POST /vendor/reviews/:id/report { reason, details } */
export function reportReview(id: string, input: ReportReviewInput): Promise<Review> {
  return mockResponse(() => {
    const review = findReview(id);
    if (review.report) throw new ApiError(i18n.t('vendor:error.reported'), 409);
    const parsed = reportReviewSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? i18n.t('vendor:error.reportInvalid'), 400);
    return save({ ...review, report: { ...parsed.data, reportedAt: new Date().toISOString() } });
  });
}
