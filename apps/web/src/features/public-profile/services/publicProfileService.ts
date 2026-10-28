import i18n from '../../../i18n';
import { findTradeCategory } from '../../../data/tradeCategories';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { isVendorPublic } from '../../auth/services/authBackend';
import { currentUser } from '../../auth/session';
import { withListingRestrictions } from '../../vendor-dashboard/services/subscriptionService';
import { computeReviewStats } from '../../vendor-dashboard/utils/reviews';
import { REVIEW_SORT, REVIEWS_PAGE_SIZE } from '../constants';
import { reviewsForVendor } from '../../jobs/services/jobService';
import { orderReviewsForVendor } from '../../orders/services/orderService';
import { mockReviewsFor } from '../mock/reviews';
import { flaggedReviewsFor, isReviewRemoved } from './reviewModeration';
import { bookableItems } from '../utils/bookableItems';
import { vendorTypicalResponseMinutes } from '../../admin/services/analyticsFacts';
import type { Vendor } from '../../../types/marketplace';
import type { Page } from '../../../types/pagination';
import type {
  BookingConfirmation,
  BookingRequest,
  PublicReview,
  PublicVendorProfile,
  ReviewSort,
  ReviewSummary } from
'../types';

/** "Aisha Mohammed" → "Aisha M.", the way reviewer names appear publicly. */
const publicName = (fullName: string) => {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

/**
 * The vendors as first loaded. Mock reviews are generated from these, so recalculating a vendor's live
 * rating (after a review is removed) never regenerates their other reviews.
 */
const seedVendors = new Map(getAllVendors().map((v) => [v.id, v]));

/**
 * Reviews customers left on real jobs and product orders, recent flagged ones, then the generated mock
 * reviews. Reviews removed by Gwani's moderators are left out everywhere, including the rating.
 */
function allReviewsFor(vendor: Vendor): PublicReview[] {
  const fromJobs = reviewsForVendor(vendor.id).map((r): PublicReview => ({
    id: `job-${r.jobId}`,
    reviewerName: publicName(r.customerName),
    rating: r.rating,
    comment: r.comment,
    serviceName: r.serviceName,
    createdAt: r.at,
    reply: null
  }));
  const fromOrders = orderReviewsForVendor(vendor.id).map((r): PublicReview => ({
    id: `order-${r.orderId}`,
    reviewerName: publicName(r.customerName),
    rating: r.rating,
    comment: r.comment,
    serviceName: r.itemsSummary,
    createdAt: r.at,
    reply: null
  }));
  return [...fromJobs, ...fromOrders, ...flaggedReviewsFor(vendor.id), ...mockReviewsFor(seedVendors.get(vendor.id) ?? vendor)].filter((r) => !isReviewRemoved(r.id));
}

function findVendor(vendorId: string): Vendor {
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  if (!vendor) throw new ApiError(i18n.t('discovery:profile.errors.notFound'), 404);
  return withListingRestrictions(vendor);
}

/** GET /vendors/:id — hidden from customers until the owner has verified their phone (the owner can still preview it). */
export function getVendorProfile(vendorId: string): Promise<PublicVendorProfile> {
  return mockResponse(() => {
    if (!isVendorPublic(vendorId) && currentUser()?.vendorId !== vendorId) throw new ApiError(i18n.t('discovery:profile.errors.notFound'), 404);
    const vendor = findVendor(vendorId);
    // "Usually responds within…": the same working-hours SLA helper the admin dashboard uses.
    return { vendor: { ...vendor, responseTimeMinutes: vendorTypicalResponseMinutes(vendor.id) }, kind: findTradeCategory(vendor.tradeCategory)?.kind ?? 'service' };
  });
}

/** Sync read for churn analytics: a vendor's live review ratings with dates, oldest first. */
export function ratingsTimelineNow(vendorId: string): {at: string;rating: number;}[] {
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  if (!vendor) return [];
  return allReviewsFor(vendor).map((r) => ({ at: r.createdAt, rating: r.rating })).sort((a, b) => a.at.localeCompare(b.at));
}

/** The rating and count from a vendor's live reviews, right now (used to recalculate after a moderator removes a review). */
export function reviewStatsNow(vendorId: string): ReviewSummary {
  return computeReviewStats(allReviewsFor(findVendor(vendorId)));
}

/** One public review by id, for the moderation queue (null once removed or if it doesn't exist). */
export function findPublicReview(vendorId: string, reviewId: string): PublicReview | null {
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  return vendor ? allReviewsFor(vendor).find((r) => r.id === reviewId) ?? null : null;
}

/** GET /vendors/:id/reviews/summary — average, total and count per star. */
export function getReviewSummary(vendorId: string): Promise<ReviewSummary> {
  return mockResponse(() => computeReviewStats(allReviewsFor(findVendor(vendorId))));
}

const SORTERS: Record<ReviewSort, (a: PublicReview, b: PublicReview) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  highest: (a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt),
  lowest: (a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt)
};

/** GET /vendors/:id/reviews?sort=&page=&pageSize= */
export function listVendorReviews(
vendorId: string,
{ sort = REVIEW_SORT.Newest, page, pageSize = REVIEWS_PAGE_SIZE }: {sort?: ReviewSort;page: number;pageSize?: number;})
: Promise<Page<PublicReview>> {
  return mockResponse(() => {
    const sorted = allReviewsFor(findVendor(vendorId)).sort(SORTERS[sort]);
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: sorted.length,
      hasMore: start + pageSize < sorted.length
    };
  });
}

/**
 * POST /vendors/:id/requests
 * MOCK: records nothing and always succeeds for an available vendor. The full booking flow comes later.
 */
export function requestBooking(vendorId: string, input: BookingRequest): Promise<BookingConfirmation> {
  return mockResponse(() => {
    const vendor = findVendor(vendorId);
    if (vendor.unavailable) throw new ApiError(i18n.t('jobs:error.notTakingRequests', { name: vendor.name }), 409);
    const item = bookableItems(vendor).find((i) => i.id === input.itemId);
    if (!item) throw new ApiError(i18n.t('discovery:profile.errors.itemGone'), 409);
    return {
      reference: `GW-${Math.floor(100000 + Math.random() * 900000)}`,
      itemName: item.name,
      requestedFor: new Date(`${input.date}T${input.time}`).toISOString()
    };
  }, 800);
}
