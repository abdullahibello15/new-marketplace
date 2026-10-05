import type { Place, SortOption, SuggestionGroupId } from './types';

export const SEARCH_ROUTE = '/search';

/** URL query params on /search. Lists are comma-separated, e.g. ?category=plumber,grocer. */
export const SEARCH_PARAM = {
  Query: 'q',
  Category: 'category',
  Tier: 'tier',
  Radius: 'radius',
  Lga: 'lga',
  PriceMin: 'min',
  PriceMax: 'max',
  Sort: 'sort',
  View: 'view'
} as const;

export const RESULTS_VIEW = {
  List: 'list',
  Map: 'map'
} as const;

/** Map zoom when centring on the selected place: about a town's width. */
export const MAP_DEFAULT_ZOOM = 13;
/** Zoom used when a vendor is picked on the map, so its marker comes out of any cluster. */
export const MAP_FOCUS_ZOOM = 15;
/** Markers closer than this many pixels are grouped into a cluster. */
export const MAP_CLUSTER_RADIUS_PX = 50;
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
/** Required by the OpenStreetMap tile usage policy. */
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const SORT_OPTION = {
  Nearest: 'nearest',
  TopRated: 'rating',
  PriceLowToHigh: 'price'
} as const;

export const SORT_OPTIONS: {id: SortOption;label: string;}[] = [
{ id: SORT_OPTION.Nearest, label: 'Nearest' },
{ id: SORT_OPTION.TopRated, label: 'Top rated' },
{ id: SORT_OPTION.PriceLowToHigh, label: 'Price: low to high' }];


export const AREA_MODE = {
  Distance: 'distance',
  Lga: 'lga'
} as const;

export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 50;
/** Where the distance slider starts. Leaving it here means "nearby" (the default, not an active filter). */
export const RADIUS_DEFAULT_KM = 40;

/** Price slider positions in whole Naira. Uneven steps because most jobs cost under ₦50k. */
export const PRICE_STOPS = [0, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
export const PRICE_INPUT_MAX = 100_000_000;

/** Desktop filters apply on their own once the user pauses. */
export const FILTER_APPLY_DEBOUNCE_MS = 400;

export const PLACE_KIND = {
  Lga: 'lga',
  Town: 'town'
} as const;

/** Chanchaga, Minna: where a new customer starts until they pick a place. */
export const DEFAULT_PLACE: Place = {
  id: 'lga-chanchaga',
  name: 'Chanchaga',
  kind: PLACE_KIND.Lga,
  lga: 'Chanchaga',
  context: 'Minna',
  coordinates: { lat: 9.6139, lng: 6.5569 }
};

/** Vendors further than this are left out unless they say they serve the customer's LGA. */
export const NEARBY_RADIUS_KM = 40;
export const FEED_PAGE_SIZE = 6;

export const SUGGESTION_DEBOUNCE_MS = 300;
export const SUGGESTIONS_PER_GROUP = 4;
export const RECENT_SEARCHES_MAX = 6;
export const QUERY_MAX_LENGTH = 80;

export const STORAGE_KEYS = {
  Place: 'gwani.place',
  RecentSearches: 'gwani.recentSearches'
} as const;

export const SUGGESTION_GROUP = {
  Recent: 'recent',
  Categories: 'categories',
  Services: 'services',
  Vendors: 'vendors'
} as const;

export const SUGGESTION_GROUP_LABELS: Record<SuggestionGroupId, string> = {
  recent: 'Recent searches',
  categories: 'Categories',
  services: 'Services',
  vendors: 'Vendors'
};

export const placeLabel = (place: Pick<Place, 'name' | 'context'>) => `${place.name}, ${place.context}`;
