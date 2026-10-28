import type { CategoryKind } from '../../types/marketplace';
import type { ReviewSort } from './types';

export const vendorProfilePath = (vendorId: string) => `/vendors/${encodeURIComponent(vendorId)}`;

/** Anchors for in-page links (e.g. the header rating jumps to reviews). */
export const PROFILE_SECTION_ID = {
  About: 'about',
  Services: 'services',
  Portfolio: 'portfolio',
  Reviews: 'reviews'
} as const;

export const REVIEW_SORT = {
  Newest: 'newest',
  Highest: 'highest',
  Lowest: 'lowest'
} as const;

export const REVIEW_SORT_OPTIONS: {id: ReviewSort;label: string;}[] = [
{ id: REVIEW_SORT.Newest, label: 'Newest' },
{ id: REVIEW_SORT.Highest, label: 'Highest' },
{ id: REVIEW_SORT.Lowest, label: 'Lowest' }];


export const REVIEWS_PAGE_SIZE = 5;

/** "Usually responds …" wording, by typical reply time in minutes. First bucket that fits wins. */
export const RESPONSE_TIME_LABELS: {maxMinutes: number;label: string;}[] = [
{ maxMinutes: 15, label: 'within 15 minutes' },
{ maxMinutes: 60, label: 'within 1 hour' },
{ maxMinutes: 240, label: 'within a few hours' },
{ maxMinutes: 1440, label: 'within a day' },
{ maxMinutes: Infinity, label: 'within a few days' }];


/** Main call to action: services are booked, retail items are requested. */
export const BOOK_ACTION_LABEL: Record<CategoryKind, string> = {
  service: 'Book Now',
  retail: 'Request'
};

export const BOOKABLE_ITEM_TYPE = {
  Service: 'service',
  Product: 'product'
} as const;

export const BOOKING_MESSAGE_MIN = 10;
export const BOOKING_MESSAGE_MAX = 500;
/** How far ahead customers can ask for a date. */
export const BOOKING_WINDOW_DAYS = 60;
