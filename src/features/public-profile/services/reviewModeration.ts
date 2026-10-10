import { mockFlaggedReviews, type FlaggedReview } from '../mock/flaggedReviews';

/*
 * MOCK store of moderation decisions on customer reviews (our backend's side). Reviews removed by Gwani's
 * moderators disappear from the public profile and the vendor's dashboard and no longer count towards the
 * rating. Reviews flagged automatically after going live are kept here until a moderator decides.
 */
const removed = new Map<string, {reason: string;at: string;}>();
const flagged: FlaggedReview[] = structuredClone(mockFlaggedReviews);

export const isReviewRemoved = (reviewId: string) => removed.has(reviewId);

export function removeReview(reviewId: string, reason: string, at = new Date().toISOString()): void {
  removed.set(reviewId, { reason, at });
}

/** An appeal upheld, or a removal reversed. */
export function restoreReview(reviewId: string): void {
  removed.delete(reviewId);
}

/** Flagged reviews that are live on this vendor's profile (removed ones are left out). */
export const flaggedReviewsFor = (vendorId: string) => flagged.filter((r) => r.vendorId === vendorId && !removed.has(r.id));

/** Every flagged review, removed or not, for the moderation queue. */
export const allFlaggedReviews = (): readonly FlaggedReview[] => flagged;
