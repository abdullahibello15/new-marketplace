import { ApiError, mockResponse } from '../../../services/mockApi';
import { mockReviews } from '../mock/reviews';
import { reportReviewSchema, reviewReplySchema } from '../schemas';
import type { ReportReviewInput, Review } from '../types';

let reviews: Review[] = structuredClone(mockReviews);

function findReview(id: string): Review {
  const review = reviews.find((r) => r.id === id);
  if (!review) throw new ApiError('This review no longer exists.', 404);
  return review;
}

function save(updated: Review): Review {
  reviews = reviews.map((r) => r.id === updated.id ? updated : r);
  return updated;
}

/** GET /vendor/reviews */
export function listReviews(): Promise<Review[]> {
  return mockResponse(() => reviews);
}

/** POST /vendor/reviews/:id/reply { body }. One reply per review. */
export function replyToReview(id: string, body: string): Promise<Review> {
  return mockResponse(() => {
    const review = findReview(id);
    if (review.reply) throw new ApiError('You’ve already replied to this review.', 409);
    // Validate again on the "server": never trust the client.
    const parsed = reviewReplySchema.safeParse({ body });
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? 'That reply isn’t valid.', 400);
    return save({ ...review, reply: { body: parsed.data.body, createdAt: new Date().toISOString() } });
  });
}

/** POST /vendor/reviews/:id/report { reason, details } */
export function reportReview(id: string, input: ReportReviewInput): Promise<Review> {
  return mockResponse(() => {
    const review = findReview(id);
    if (review.report) throw new ApiError('You’ve already reported this review.', 409);
    const parsed = reportReviewSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? 'That report isn’t valid.', 400);
    return save({ ...review, report: { ...parsed.data, reportedAt: new Date().toISOString() } });
  });
}
