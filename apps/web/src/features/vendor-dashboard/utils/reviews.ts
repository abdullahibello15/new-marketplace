import type { Review, ReviewStats } from '../types';

/** Only reads each review's rating, so customer-facing reviews can use it too. */
export function computeReviewStats(reviews: Pick<Review, 'rating'>[]): ReviewStats {
  const counts: ReviewStats['counts'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    counts[r.rating] += 1;
    sum += r.rating;
  }
  const total = reviews.length;
  // One decimal place, as shown to customers.
  const average = total === 0 ? 0 : Math.round(sum / total * 10) / 10;
  return { total, average, counts };
}
