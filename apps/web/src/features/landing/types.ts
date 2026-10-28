import type { CategoryKind, TradeCategory, Verification } from '../../types/marketplace';

/** One provider or shop card on the landing page: public profile facts only. */
export interface LandingVendorCard {
  id: string;
  name: string;
  kind: CategoryKind;
  tradeCategory: TradeCategory;
  /** A small copy of the profile photo where one exists. */
  photo: string;
  verification: Verification;
  rating: number;
  reviews: number;
  /** LGA name, e.g. "Bosso". */
  area: string;
  /** Lowest service or product price in whole Naira; null when none is listed. */
  priceFrom: number | null;
}

export interface LandingTestimonial {
  id: string;
  /** As the customer gave it with their review. */
  reviewerName: string;
  comment: string;
  vendorName: string;
}

/** Everything the landing page shows from the app's data (public data only). */
export interface LandingHighlights {
  stats: {providers: number;reviews: number;lgas: number;};
  /** Listed providers per category. */
  categoryCounts: Partial<Record<TradeCategory, number>>;
  featured: Record<CategoryKind, LandingVendorCard[]>;
  testimonials: LandingTestimonial[];
  /** For the hero's floating cards; null when the data has nothing to show. */
  topRating: number | null;
  fastestReplyMinutes: number | null;
}
