import { productCategories } from '../../../data/productCategories';
import { normalizeSearch, sanitizeText } from '../../../lib/sanitize';
import { matchesWordPrefixes } from '../../../lib/textMatch';
import { STOCK_STATUS, getStockStatus } from '../../../utils/products';
import { PRICE_INPUT_MAX, PRODUCT_PARAM, PRODUCT_SORT, PRODUCT_SORTS, QUERY_MAX_LENGTH } from '../constants';
import type { Product, ProductCategory } from '../../../types/marketplace';
import type { ProductFilters, ProductListing, ProductSort } from '../types';

/*
 * The product catalogue's rules, pure so they're tested and the backend can reuse them: which products
 * are public, how filters read from and write to the URL, and how results are matched and sorted.
 */

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  query: '',
  category: null,
  price: { min: null, max: null },
  inStockOnly: false,
  sort: PRODUCT_SORT.Recommended
};

/** The rule the shop grid uses too: hidden products, and any without a photo, are never public. */
export const isPublicProduct = (p: Pick<Product, 'available' | 'images'>) => p.available && p.images.length > 0;

const isCategory = (v: string | null): v is ProductCategory => productCategories.some((c) => c.id === v);
const isSort = (v: string | null): v is ProductSort => PRODUCT_SORTS.some((s) => s === v);

function wholeNaira(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n <= PRICE_INPUT_MAX ? n : null;
}

/** Reads filters from the URL. Anything unknown or out of range is dropped rather than trusted. */
export function parseProductFilters(params: URLSearchParams): ProductFilters {
  const category = params.get(PRODUCT_PARAM.Category);
  const sort = params.get(PRODUCT_PARAM.Sort);
  const min = wholeNaira(params.get(PRODUCT_PARAM.PriceMin));
  let max = wholeNaira(params.get(PRODUCT_PARAM.PriceMax));
  if (min !== null && max !== null && max < min) max = null;
  return {
    query: sanitizeText(params.get(PRODUCT_PARAM.Query) ?? '').slice(0, QUERY_MAX_LENGTH),
    category: isCategory(category) ? category : null,
    price: { min, max },
    inStockOnly: params.get(PRODUCT_PARAM.InStock) === '1',
    sort: isSort(sort) ? sort : PRODUCT_SORT.Recommended
  };
}

/** "?q=pipe&category=plumbing_supplies", leaving out defaults so shared links stay short. */
export function productFiltersToSearchString(f: ProductFilters): string {
  const params = new URLSearchParams();
  if (f.query) params.set(PRODUCT_PARAM.Query, f.query);
  if (f.category) params.set(PRODUCT_PARAM.Category, f.category);
  if (f.price.min !== null) params.set(PRODUCT_PARAM.PriceMin, String(f.price.min));
  if (f.price.max !== null) params.set(PRODUCT_PARAM.PriceMax, String(f.price.max));
  if (f.inStockOnly) params.set(PRODUCT_PARAM.InStock, '1');
  if (f.sort !== PRODUCT_SORT.Recommended) params.set(PRODUCT_PARAM.Sort, f.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const sameProductFilters = (a: ProductFilters, b: ProductFilters) => productFiltersToSearchString(a) === productFiltersToSearchString(b);

/** Filters other than the search text and sort order (the count on the "Clear filters" control). */
export const countProductFilters = (f: ProductFilters) =>
Number(f.category !== null) + Number(f.price.min !== null || f.price.max !== null) + Number(f.inStockOnly);

const inStock = (l: ProductListing) => getStockStatus(l.product) !== STOCK_STATUS.out;
const isOpen = (l: ProductListing) => !l.shop.unavailable;
const servesPlace = (l: ProductListing, lga: string | null) => lga !== null && (l.shop.lga === lga || l.shop.serviceAreas.some((a) => a === lga));

function matchesQuery({ product, shop }: ProductListing, q: string, categoryLabel: (id: ProductCategory) => string): boolean {
  return [product.name, product.description, categoryLabel(product.category), shop.name].some((text) => matchesWordPrefixes(text, q));
}

/**
 * The public products matching the filters, sorted. Shops that aren't taking orders always go last
 * (still shown, so customers can find them later); within each group the chosen order applies, then
 * the product name so the order is stable across pages. `categoryLabel` lets search match the
 * category name in the reader's language.
 */
export function matchProducts(
listings: ProductListing[],
filters: ProductFilters,
{ placeLga = null, categoryLabel = (id) => productCategories.find((c) => c.id === id)?.label ?? id }: {placeLga?: string | null;categoryLabel?: (id: ProductCategory) => string;} = {})
: ProductListing[] {
  const q = normalizeSearch(filters.query);
  const { min, max } = filters.price;
  const sorters: Record<ProductSort, (a: ProductListing, b: ProductListing) => number> = {
    [PRODUCT_SORT.Recommended]: (a, b) =>
    Number(inStock(b)) - Number(inStock(a)) ||
    Number(servesPlace(b, placeLga)) - Number(servesPlace(a, placeLga)) ||
    b.shop.rating - a.shop.rating,
    [PRODUCT_SORT.PriceLowToHigh]: (a, b) => a.product.price - b.product.price,
    [PRODUCT_SORT.PriceHighToLow]: (a, b) => b.product.price - a.product.price,
    [PRODUCT_SORT.TopRatedShop]: (a, b) => Number(b.shop.reviews > 0) - Number(a.shop.reviews > 0) || b.shop.rating - a.shop.rating || b.shop.reviews - a.shop.reviews
  };
  return listings.
  filter((l) => isPublicProduct(l.product)).
  filter((l) => !filters.category || l.product.category === filters.category).
  filter((l) => (min === null || l.product.price >= min) && (max === null || l.product.price <= max)).
  filter((l) => !filters.inStockOnly || inStock(l)).
  filter((l) => !q || matchesQuery(l, q, categoryLabel)).
  sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || sorters[filters.sort](a, b) || a.product.name.localeCompare(b.product.name) || a.shop.id.localeCompare(b.shop.id));
}
