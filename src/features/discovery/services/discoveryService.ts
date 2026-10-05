import { browseCategories, findTradeCategory } from '../../../data/tradeCategories';
import { distanceKm } from '../../../lib/geo';
import { normalizeSearch } from '../../../lib/sanitize';
import { matchesWordPrefixes } from '../../../lib/textMatch';
import { mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { formatTrade } from '../../../utils/format';
import { AREA_MODE, FEED_PAGE_SIZE, NEARBY_RADIUS_KM, SORT_OPTION, SUGGESTIONS_PER_GROUP } from '../constants';
import type { Vendor } from '../../../types/marketplace';
import type { Page } from '../../../types/pagination';
import type {
  AreaFilter,
  MappableVendorListing,
  Place,
  SortOption,
  SuggestionResults,
  VendorListing,
  VendorMapResult,
  VendorSearchParams } from
'../types';

const SUGGESTION_LATENCY_MS = 250;

interface Located {
  vendor: Vendor;
  /** Null when the vendor has no location yet. */
  distance: number | null;
}

/** Unknown distances sort after every known one. */
const byDistance = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity);

function withDistance(place: Place): Located[] {
  return getAllVendors().map((vendor) => ({
    vendor,
    distance: vendor.coordinates ? distanceKm(place.coordinates, vendor.coordinates) : null
  }));
}

/**
 * Vendors near the place, or who say they serve its LGA, nearest first. Vendors without a location
 * can only qualify through their service areas.
 */
function nearbyVendors(place: Place): Located[] {
  return withDistance(place).
  filter(({ vendor, distance }) => distance !== null && distance <= NEARBY_RADIUS_KM || vendor.serviceAreas.includes(place.lga)).
  sort((a, b) => byDistance(a.distance, b.distance) || b.vendor.rating - a.vendor.rating);
}

function matchesQuery(vendor: Vendor, q: string): boolean {
  const category = findTradeCategory(vendor.tradeCategory);
  const haystack = [vendor.name, vendor.tagline, formatTrade(vendor), category?.browseLabel ?? '', ...(category?.keywords ?? []), ...vendor.services.map((s) => s.name)];
  return haystack.some((text) => matchesWordPrefixes(text, q));
}

function toListing({ vendor, distance }: Located): VendorListing {
  const prices = vendor.services;
  return {
    id: vendor.id,
    name: vendor.name,
    photo: vendor.photo,
    rating: vendor.rating,
    reviews: vendor.reviews,
    verification: vendor.verification,
    tradeCategory: vendor.tradeCategory,
    tradeCategoryOther: vendor.tradeCategoryOther,
    serviceAreas: vendor.serviceAreas,
    coordinates: vendor.coordinates,
    priceFrom: prices.length ? Math.min(...prices.map((s) => s.minPrice)) : null,
    priceTo: prices.length ? Math.max(...prices.map((s) => s.maxPrice)) : null,
    distanceKm: distance
  };
}

/**
 * Which vendors are in the search area: chosen LGAs, a set radius, or the default "nearby".
 * A set radius needs a known distance, so vendors without a location drop out of it.
 */
function vendorsInArea(place: Place, area: AreaFilter): Located[] {
  if (area.mode === AREA_MODE.Distance && area.radiusKm === null) return nearbyVendors(place);
  return withDistance(place).filter(({ vendor, distance }) =>
  area.mode === AREA_MODE.Lga ?
  vendor.serviceAreas.some((a) => area.lgas.includes(a)) :
  distance !== null && distance <= (area.radiusKm ?? NEARBY_RADIUS_KM)
  );
}

/** A vendor matches a price filter if any of its prices fall in the range, i.e. the two ranges overlap. */
function overlapsPrice(listing: VendorListing, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  if (listing.priceFrom === null || listing.priceTo === null) return false;
  return (min === null || listing.priceTo >= min) && (max === null || listing.priceFrom <= max);
}

const hasNoReviews = (l: VendorListing) => l.reviews === 0 ? 1 : 0;

const SORTERS: Record<SortOption, (a: VendorListing, b: VendorListing) => number> = {
  nearest: (a, b) => byDistance(a.distanceKm, b.distanceKm) || b.rating - a.rating,
  // Highest average first; ties go to more reviews, then nearer. Vendors with no reviews yet go last.
  rating: (a, b) =>
  hasNoReviews(a) - hasNoReviews(b) || b.rating - a.rating || b.reviews - a.reviews || byDistance(a.distanceKm, b.distanceKm),
  // Vendors without prices go last.
  price: (a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity) || byDistance(a.distanceKm, b.distanceKm)
};

/** Every vendor matching the filters, sorted. Shared by the paged list and the map. */
function matchingListings({
  place,
  query = '',
  categories = [],
  tiers = [],
  area = { mode: AREA_MODE.Distance, radiusKm: null },
  price = { min: null, max: null },
  sort = SORT_OPTION.Nearest
}: Omit<VendorSearchParams, 'page' | 'pageSize'>): VendorListing[] {
  const q = normalizeSearch(query);
  return vendorsInArea(place, area).
  filter(({ vendor }) => !categories.length || categories.includes(vendor.tradeCategory)).
  filter(({ vendor }) => !tiers.length || tiers.includes(vendor.verification)).
  filter(({ vendor }) => !q || matchesQuery(vendor, q)).
  map(toListing).
  filter((listing) => overlapsPrice(listing, price.min, price.max)).
  sort(SORTERS[sort]);
}

/**
 * GET /vendors?near=lat,lng&q=&category=&tier=&radius=|lga=&min=&max=&sort=&page=&pageSize=
 * Used by the home feed (no filters) and the search results page. All filters combine (AND);
 * values within one filter (e.g. two categories) are alternatives (OR).
 */
export function searchVendors({ page, pageSize = FEED_PAGE_SIZE, ...criteria }: VendorSearchParams): Promise<Page<VendorListing>> {
  return mockResponse(() => {
    const matches = matchingListings(criteria);
    const start = (page - 1) * pageSize;
    return {
      items: matches.slice(start, start + pageSize),
      page,
      pageSize,
      total: matches.length,
      hasMore: start + pageSize < matches.length
    };
  });
}

/**
 * GET /vendors/map?near=lat,lng&q=&category=&tier=&radius=|lga=&min=&max=
 * All matches at once (a map can't paginate), minus vendors with no location, which are counted instead.
 */
export function searchVendorsForMap(criteria: Omit<VendorSearchParams, 'page' | 'pageSize'>): Promise<VendorMapResult> {
  return mockResponse(() => {
    const matches = matchingListings(criteria);
    const pins = matches.filter((l): l is MappableVendorListing => l.coordinates !== null);
    return { pins, missingLocation: matches.length - pins.length };
  });
}

/** GET /search/suggestions?q=&near=lat,lng — grouped typeahead results. */
export function getSuggestions(query: string, place: Place): Promise<SuggestionResults> {
  return mockResponse(() => {
    const q = normalizeSearch(query);
    if (!q) return { categories: [], services: [], vendors: [] };

    const categories = browseCategories.
    filter((c) => [c.browseLabel, c.label, ...c.keywords].some((text) => matchesWordPrefixes(text, q))).
    slice(0, SUGGESTIONS_PER_GROUP).
    map((c) => ({ id: c.id, label: c.browseLabel }));

    // Nearby vendors first, so local services and names rank above far-away ones.
    const ranked = [...nearbyVendors(place).map((n) => n.vendor), ...getAllVendors()];

    const seen = new Set<string>();
    const services: SuggestionResults['services'] = [];
    for (const vendor of ranked) {
      for (const s of vendor.services) {
        const key = s.name.toLowerCase();
        if (matchesWordPrefixes(key, q) && !seen.has(key) && services.length < SUGGESTIONS_PER_GROUP) {
          seen.add(key);
          services.push({ name: s.name, category: vendor.tradeCategory });
        }
      }
    }

    const vendorIds = new Set<string>();
    const vendors: SuggestionResults['vendors'] = [];
    for (const v of ranked) {
      if (vendors.length >= SUGGESTIONS_PER_GROUP) break;
      if (vendorIds.has(v.id) || !matchesWordPrefixes(v.name, q)) continue;
      vendorIds.add(v.id);
      vendors.push({ id: v.id, name: v.name, tradeLabel: formatTrade(v), area: v.lga });
    }

    return { categories, services, vendors };
  }, SUGGESTION_LATENCY_MS);
}
