import type { CategoryKind, Vendor } from '../../types/marketplace';
import type { ReviewStats, StarLevel } from '../vendor-dashboard/types';
import type { BOOKABLE_ITEM_TYPE, REVIEW_SORT } from './constants';

type ValueOf<T> = T[keyof T];

/** What the profile page shows: the vendor plus whether they sell a service or retail goods. */
export interface PublicVendorProfile {
  vendor: Vendor;
  kind: CategoryKind;
}

/* ---------- Reviews ---------- */

export type ReviewSort = ValueOf<typeof REVIEW_SORT>;

/** Same shape as the vendor dashboard's stats, so its rating breakdown component can be reused. */
export type ReviewSummary = ReviewStats;

export interface PublicReview {
  id: string;
  reviewerName: string;
  rating: StarLevel;
  /** May be empty: some customers only leave stars. */
  comment: string;
  /** The service the review is about, when known. */
  serviceName: string | null;
  createdAt: string;
  reply: {body: string;createdAt: string;} | null;
}

/* ---------- Booking / request ---------- */

export type BookableItemType = ValueOf<typeof BOOKABLE_ITEM_TYPE>;

/** Something the customer can book or request: one of the vendor's services or in-stock products. */
export interface BookableItem {
  id: string;
  type: BookableItemType;
  name: string;
  /** Whole Naira. Equal for a fixed-price product. */
  minPrice: number;
  maxPrice: number;
}

export interface BookingRequest {
  itemId: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm", 24-hour */
  time: string;
  message: string;
}

export interface BookingConfirmation {
  reference: string;
  itemName: string;
  /** ISO date-time the customer asked for. */
  requestedFor: string;
}
