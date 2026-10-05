import type { GeoPoint, NigerLga, TradeCategory, Vendor, Verification } from '../../types/marketplace';
import type { AREA_MODE, PLACE_KIND, RESULTS_VIEW, SORT_OPTION, SUGGESTION_GROUP } from './constants';

type ValueOf<T> = T[keyof T];

/* ---------- Location ---------- */

export type PlaceKind = ValueOf<typeof PLACE_KIND>;

/** An LGA or a town/neighbourhood the customer can pick as "where I am". */
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  lga: NigerLga;
  /** Shown after the name, e.g. "Minna" in "Chanchaga, Minna". */
  context: string;
  coordinates: GeoPoint;
}

/* ---------- Vendor listings ---------- */

/** What search and the feed return for each vendor: enough for a card, not the whole profile. */
export interface VendorListing extends Pick<
  Vendor,
  'id' | 'name' | 'photo' | 'rating' | 'reviews' | 'verification' | 'tradeCategory' | 'tradeCategoryOther' | 'serviceAreas' | 'coordinates'>
{
  /** Lowest and highest service prices in whole Naira; null when the vendor lists no services. */
  priceFrom: number | null;
  priceTo: number | null;
  /** From the customer's selected place; null when the vendor has no location yet. */
  distanceKm: number | null;
}

/** A listing that can go on the map. */
export type MappableVendorListing = VendorListing & {coordinates: GeoPoint;};

/** Every vendor matching the filters (not just one page), for the map. */
export interface VendorMapResult {
  pins: MappableVendorListing[];
  /** Matching vendors left off the map because they have no location yet. */
  missingLocation: number;
}

export type ResultsView = ValueOf<typeof RESULTS_VIEW>;

export type SortOption = ValueOf<typeof SORT_OPTION>;
export type AreaMode = ValueOf<typeof AREA_MODE>;

/** Where to look: within a distance of the selected place, or in chosen LGAs. */
export type AreaFilter = {mode: 'distance';radiusKm: number | null;} | {mode: 'lga';lgas: NigerLga[];};

/** Everything that narrows or orders search results. Lives in the URL; see utils/searchFilters. */
export interface SearchFilters {
  query: string;
  categories: TradeCategory[];
  tiers: Verification[];
  /** radiusKm null means the default "nearby" area. */
  area: AreaFilter;
  /** Whole Naira; null means no limit on that side. */
  price: {min: number | null;max: number | null;};
  sort: SortOption;
  /** List or map. Not a filter (doesn't change which vendors match) but kept in the URL too. */
  view: ResultsView;
}

export interface VendorSearchParams extends Partial<Omit<SearchFilters, 'area' | 'view'>> {
  place: Place;
  area?: AreaFilter;
  page: number;
  pageSize?: number;
}

/** One removable chip above the results. */
export interface ActiveFilterChip {
  key: string;
  label: string;
  /** Accessible name for the remove button. */
  removeLabel: string;
  remove: (filters: SearchFilters) => SearchFilters;
}

/* ---------- Search & suggestions ---------- */

export type SuggestionGroupId = ValueOf<typeof SUGGESTION_GROUP>;

/** Where a search goes. Every suggestion and recent search resolves to one of these. */
export type SearchTarget = {kind: 'category';category: TradeCategory;} | {kind: 'query';query: string;};

export interface SuggestionResults {
  categories: {id: TradeCategory;label: string;}[];
  services: {name: string;category: TradeCategory;}[];
  vendors: {id: string;name: string;tradeLabel: string;area: string;}[];
}

export interface RecentSearch {
  label: string;
  target: SearchTarget;
}

/** One row in the typeahead list, whatever group it came from. */
export interface SuggestionOption {
  /** Stable and DOM-safe, used for aria-activedescendant. */
  id: string;
  group: SuggestionGroupId;
  label: string;
  detail?: string;
  target: SearchTarget;
}
