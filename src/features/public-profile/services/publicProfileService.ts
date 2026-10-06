import { findTradeCategory } from '../../../data/tradeCategories';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { withListingRestrictions } from '../../vendor-dashboard/services/subscriptionService';
import { computeReviewStats } from '../../vendor-dashboard/utils/reviews';
import { REVIEW_SORT, REVIEWS_PAGE_SIZE } from '../constants';
import { reviewsForVendor } from '../../jobs/services/jobService';
import { orderReviewsForVendor } from '../../orders/services/orderService';
import { mockReviewsFor } from '../mock/reviews';
import { bookableItems } from '../utils/bookableItems';
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

/** Reviews customers left on real jobs and product orders, followed by the generated mock reviews. */
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
  return [...fromJobs, ...fromOrders, ...mockReviewsFor(vendor)];
}

function findVendor(vendorId: string): Vendor {
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  if (!vendor) throw new ApiError('We couldn’t find that vendor.', 404);
  return withListingRestrictions(vendor);
}

/** GET /vendors/:id */
export function getVendorProfile(vendorId: string): Promise<PublicVendorProfile> {
  return mockResponse(() => {
    const vendor = findVendor(vendorId);
    return { vendor, kind: findTradeCategory(vendor.tradeCategory)?.kind ?? 'service' };
  });
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
    if (vendor.unavailable) throw new ApiError(`${vendor.name} isn’t taking new requests right now.`, 409);
    const item = bookableItems(vendor).find((i) => i.id === input.itemId);
    if (!item) throw new ApiError('That service or product is no longer available. Please choose another.', 409);
    return {
      reference: `GW-${Math.floor(100000 + Math.random() * 900000)}`,
      itemName: item.name,
      requestedFor: new Date(`${input.date}T${input.time}`).toISOString()
    };
  }, 800);
}
