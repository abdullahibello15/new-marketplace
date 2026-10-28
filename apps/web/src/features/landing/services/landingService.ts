import { nigerLgas } from '../../../data/nigerLgas';
import { findTradeCategory } from '../../../data/tradeCategories';
import { mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { isVendorPublic } from '../../auth/services/authBackend';
import { mockReviewsFor } from '../../public-profile/mock/reviews';
import { COMPRESSED_VENDOR_PHOTOS, LANDING_STATS_OVERRIDE } from '../constants';
import type { CategoryKind, Vendor } from '../../../types/marketplace';
import type { LandingHighlights, LandingTestimonial, LandingVendorCard } from '../types';

/*
 * GET /public/highlights (mocked) — what the public landing page shows: live counts, top-rated providers
 * and shops, and quotes from customer reviews. Public profile facts only (nothing a signed-out visitor
 * couldn't see on a vendor's public page). No made-up numbers: everything is counted from the data.
 */

const FEATURED_PER_KIND = 8;
const TESTIMONIALS = 3;
/** A rating only counts as "top" with enough reviews behind it. */
const MIN_REVIEWS_FOR_TOP = 10;

const kindOf = (v: Vendor): CategoryKind => findTradeCategory(v.tradeCategory)?.kind === 'retail' ? 'retail' : 'service';

function priceFrom(v: Vendor): number | null {
  const prices = kindOf(v) === 'retail' ?
  v.products.filter((p) => p.available && p.stock > 0).map((p) => p.price) :
  v.services.map((s) => s.minPrice);
  return prices.length ? Math.min(...prices) : null;
}

function toCard(v: Vendor): LandingVendorCard {
  return {
    id: v.id,
    name: v.name,
    kind: kindOf(v),
    tradeCategory: v.tradeCategory,
    photo: COMPRESSED_VENDOR_PHOTOS[v.photo] ?? v.photo,
    verification: v.verification,
    rating: v.rating,
    reviews: v.reviews,
    area: v.lga.replace(/\s*LGA$/, ''),
    priceFrom: priceFrom(v)
  };
}

/** Highest rated first (with enough reviews to mean something), then most reviewed. */
const byStanding = (a: Vendor, b: Vendor) => Number(b.reviews >= MIN_REVIEWS_FOR_TOP) - Number(a.reviews >= MIN_REVIEWS_FOR_TOP) || b.rating - a.rating || b.reviews - a.reviews;

/** One five-star review with something to say, from each of the best-rated providers. */
function testimonials(vendors: Vendor[]): LandingTestimonial[] {
  const out: LandingTestimonial[] = [];
  for (const v of [...vendors].sort(byStanding)) {
    const review = mockReviewsFor(v).find((r) => r.rating === 5 && r.comment.trim().length >= 40);
    if (review) out.push({ id: review.id, reviewerName: review.reviewerName, comment: review.comment.trim(), vendorName: v.name });
    if (out.length === TESTIMONIALS) break;
  }
  return out;
}

export function getLandingHighlights(): Promise<LandingHighlights> {
  return mockResponse(() => {
    const vendors = getAllVendors().filter((v) => isVendorPublic(v.id));
    const categoryCounts: LandingHighlights['categoryCounts'] = {};
    for (const v of vendors) categoryCounts[v.tradeCategory] = (categoryCounts[v.tradeCategory] ?? 0) + 1;
    const rated = vendors.filter((v) => v.reviews >= MIN_REVIEWS_FOR_TOP);
    const replies = vendors.map((v) => v.responseTimeMinutes).filter((m): m is number => typeof m === 'number' && m > 0);
    const featured = (kind: CategoryKind) => vendors.filter((v) => kindOf(v) === kind).sort(byStanding).slice(0, FEATURED_PER_KIND).map(toCard);

    return {
      stats: {
        providers: LANDING_STATS_OVERRIDE.providers ?? vendors.length,
        reviews: LANDING_STATS_OVERRIDE.reviews ?? vendors.reduce((sum, v) => sum + v.reviews, 0),
        lgas: nigerLgas.length
      },
      categoryCounts,
      featured: { service: featured('service'), retail: featured('retail') },
      testimonials: testimonials(vendors),
      topRating: rated.length ? Math.max(...rated.map((v) => v.rating)) : null,
      fastestReplyMinutes: replies.length ? Math.min(...replies) : null
    };
  }, 250, { auth: false });
}
