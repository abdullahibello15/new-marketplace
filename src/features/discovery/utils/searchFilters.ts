import { nigerLgas } from '../../../data/nigerLgas';
import { browseCategories } from '../../../data/tradeCategories';
import { findVerificationTier } from '../../../data/verificationTiers';
import { formatNumberInput } from '../../../lib/numberInput';
import { sanitizeText } from '../../../lib/sanitize';
import { formatNaira } from '../../../utils/format';
import {
  AREA_MODE,
  QUERY_MAX_LENGTH,
  RESULTS_VIEW,
  RADIUS_DEFAULT_KM,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  SEARCH_PARAM,
  SORT_OPTION,
  SORT_OPTIONS } from
'../constants';
import type { NigerLga, TradeCategory, Verification } from '../../../types/marketplace';
import type { FilterFormData, FilterFormValues } from '../schemas';
import type { ActiveFilterChip, ResultsView, SearchFilters, SortOption } from '../types';

/*
 * Filters live in the URL so results can be shared and Back/Forward work. These helpers are the only
 * place that knows the URL format; everything else works with SearchFilters.
 */

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  categories: [],
  tiers: [],
  area: { mode: AREA_MODE.Distance, radiusKm: null },
  price: { min: null, max: null },
  sort: SORT_OPTION.Nearest,
  view: RESULTS_VIEW.List
};

const isDefined = <T,>(v: T | undefined): v is T => v !== undefined;
const unique = <T,>(values: T[]) => [...new Set(values)];
const listParam = (raw: string | null) => (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function wholeNumberParam(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

/** Reads filters from the URL. Anything unknown or out of range is dropped rather than trusted. */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const categories = unique(listParam(params.get(SEARCH_PARAM.Category)).map((id) => browseCategories.find((c) => c.id === id)?.id).filter(isDefined));
  const tiers = unique(listParam(params.get(SEARCH_PARAM.Tier)).map((id) => findVerificationTier(id)?.id).filter(isDefined));
  const lgas = unique(listParam(params.get(SEARCH_PARAM.Lga)).filter((v): v is NigerLga => nigerLgas.some((l) => l === v)));
  const radius = wholeNumberParam(params.get(SEARCH_PARAM.Radius));
  const min = wholeNumberParam(params.get(SEARCH_PARAM.PriceMin));
  let max = wholeNumberParam(params.get(SEARCH_PARAM.PriceMax));
  if (min !== null && max !== null && max < min) max = null;
  const sortParam = params.get(SEARCH_PARAM.Sort);

  return {
    query: sanitizeText(params.get(SEARCH_PARAM.Query) ?? '').slice(0, QUERY_MAX_LENGTH),
    categories,
    tiers,
    area: lgas.length ?
    { mode: AREA_MODE.Lga, lgas } :
    { mode: AREA_MODE.Distance, radiusKm: radius !== null && radius >= RADIUS_MIN_KM && radius <= RADIUS_MAX_KM ? radius : null },
    price: { min, max },
    sort: SORT_OPTIONS.find((o) => o.id === sortParam)?.id ?? SORT_OPTION.Nearest,
    view: params.get(SEARCH_PARAM.View) === RESULTS_VIEW.Map ? RESULTS_VIEW.Map : RESULTS_VIEW.List
  };
}

/** Writes filters as URL params, leaving out defaults so shared links stay short. */
export function filtersToParams(f: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.query) params.set(SEARCH_PARAM.Query, f.query);
  if (f.categories.length) params.set(SEARCH_PARAM.Category, f.categories.join(','));
  if (f.tiers.length) params.set(SEARCH_PARAM.Tier, f.tiers.join(','));
  if (f.area.mode === AREA_MODE.Lga && f.area.lgas.length) params.set(SEARCH_PARAM.Lga, f.area.lgas.join(','));
  if (f.area.mode === AREA_MODE.Distance && f.area.radiusKm !== null) params.set(SEARCH_PARAM.Radius, String(f.area.radiusKm));
  if (f.price.min !== null) params.set(SEARCH_PARAM.PriceMin, String(f.price.min));
  if (f.price.max !== null) params.set(SEARCH_PARAM.PriceMax, String(f.price.max));
  if (f.sort !== SORT_OPTION.Nearest) params.set(SEARCH_PARAM.Sort, f.sort);
  if (f.view === RESULTS_VIEW.Map) params.set(SEARCH_PARAM.View, f.view);
  return params;
}

/** "?category=plumber,grocer&tier=trade". Commas are left unescaped so shared links stay readable. */
export function filtersToSearchString(f: SearchFilters): string {
  const query = filtersToParams(f).toString().replace(/%2C/gi, ',');
  return query ? `?${query}` : '';
}

export const sameFilters = (a: SearchFilters, b: SearchFilters) => filtersToSearchString(a) === filtersToSearchString(b);

export function filtersToForm(f: SearchFilters): FilterFormValues {
  return {
    categories: f.categories,
    tiers: f.tiers,
    areaMode: f.area.mode,
    radiusKm: f.area.mode === AREA_MODE.Distance ? f.area.radiusKm ?? RADIUS_DEFAULT_KM : RADIUS_DEFAULT_KM,
    lgas: f.area.mode === AREA_MODE.Lga ? f.area.lgas : [],
    priceMin: f.price.min === null ? '' : formatNumberInput(f.price.min),
    priceMax: f.price.max === null ? '' : formatNumberInput(f.price.max)
  };
}

/** Applies a submitted filter form. The search text and sort order aren't part of the form, so they carry over. */
export function formToFilters(data: FilterFormData, current: SearchFilters): SearchFilters {
  return {
    ...current,
    categories: data.categories,
    tiers: data.tiers,
    area:
    data.areaMode === AREA_MODE.Lga ?
    { mode: AREA_MODE.Lga, lgas: data.lgas } :
    { mode: AREA_MODE.Distance, radiusKm: data.radiusKm === RADIUS_DEFAULT_KM ? null : data.radiusKm },
    price: { min: data.priceMin, max: data.priceMax }
  };
}

/** Clears every filter but keeps the search text, sort order and list/map view. */
export const clearFilters = (f: SearchFilters): SearchFilters => ({ ...DEFAULT_FILTERS, query: f.query, sort: f.sort, view: f.view });

/** Count shown on the mobile Filters button. The search text isn't a filter, so it isn't counted. */
export function countActiveFilters(f: SearchFilters): number {
  const area = f.area.mode === AREA_MODE.Lga ? f.area.lgas.length : f.area.radiusKm !== null ? 1 : 0;
  const price = f.price.min !== null || f.price.max !== null ? 1 : 0;
  return f.categories.length + f.tiers.length + area + price;
}

function priceLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatNaira(min)} – ${formatNaira(max)}`;
  return min !== null ? `From ${formatNaira(min)}` : `Up to ${formatNaira(max ?? 0)}`;
}

export function activeFilterChips(f: SearchFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (f.query) {
    chips.push({ key: 'q', label: `“${f.query}”`, removeLabel: `Remove search “${f.query}”`, remove: (x) => ({ ...x, query: '' }) });
  }
  f.categories.forEach((id: TradeCategory) => {
    const label = browseCategories.find((c) => c.id === id)?.browseLabel ?? id;
    chips.push({ key: `c-${id}`, label, removeLabel: `Remove ${label}`, remove: (x) => ({ ...x, categories: x.categories.filter((c) => c !== id) }) });
  });
  f.tiers.forEach((id: Verification) => {
    const label = findVerificationTier(id)?.label ?? id;
    chips.push({ key: `t-${id}`, label, removeLabel: `Remove ${label}`, remove: (x) => ({ ...x, tiers: x.tiers.filter((t) => t !== id) }) });
  });
  if (f.area.mode === AREA_MODE.Distance && f.area.radiusKm !== null) {
    const label = `Within ${f.area.radiusKm} km`;
    chips.push({ key: 'radius', label, removeLabel: `Remove ${label}`, remove: (x) => ({ ...x, area: DEFAULT_FILTERS.area }) });
  }
  if (f.area.mode === AREA_MODE.Lga) {
    f.area.lgas.forEach((lga) => {
      chips.push({
        key: `l-${lga}`,
        label: `${lga} LGA`,
        removeLabel: `Remove ${lga} LGA`,
        remove: (x) => {
          if (x.area.mode !== AREA_MODE.Lga) return x;
          const lgas = x.area.lgas.filter((l) => l !== lga);
          return { ...x, area: lgas.length ? { mode: AREA_MODE.Lga, lgas } : DEFAULT_FILTERS.area };
        }
      });
    });
  }
  if (f.price.min !== null || f.price.max !== null) {
    const label = priceLabel(f.price.min, f.price.max);
    chips.push({ key: 'price', label, removeLabel: `Remove price ${label}`, remove: (x) => ({ ...x, price: DEFAULT_FILTERS.price }) });
  }
  return chips;
}

export const withSort = (f: SearchFilters, sort: SortOption): SearchFilters => ({ ...f, sort });
export const withView = (f: SearchFilters, view: ResultsView): SearchFilters => ({ ...f, view });
