import { describe, expect, it } from 'vitest';
import { PRODUCT_SORT } from '../constants';
import { DEFAULT_PRODUCT_FILTERS, matchProducts, parseProductFilters, productFiltersToSearchString } from './productSearch';
import type { Product } from '../../../types/marketplace';
import type { ProductFilters, ProductListing, ProductShop } from '../types';

const product = (id: string, over: Partial<Product> = {}): Product => ({
  id,
  name: `Product ${id}`,
  category: 'plumbing_supplies',
  price: 1_000,
  description: '',
  stock: 10,
  lowStockThreshold: 2,
  images: ['/a.jpg'],
  available: true,
  ...over
});

const shop = (id: string, over: Partial<ProductShop> = {}): ProductShop => ({
  id,
  name: `Shop ${id}`,
  lga: 'Chanchaga',
  verification: 'id',
  rating: 4,
  reviews: 3,
  unavailable: null,
  serviceAreas: [],
  ...over
});

const listing = (p: Product, s: ProductShop = shop('s1')): ProductListing => ({ product: p, shop: s });
const ids = (ls: ProductListing[]) => ls.map((l) => l.product.id);
const filters = (over: Partial<ProductFilters> = {}): ProductFilters => ({ ...DEFAULT_PRODUCT_FILTERS, ...over });

describe('product filters in the URL', () => {
  it('round-trips every filter and leaves defaults out', () => {
    const f = filters({ query: 'pipe', category: 'tools', price: { min: 500, max: 5_000 }, inStockOnly: true, sort: PRODUCT_SORT.PriceLowToHigh });
    const search = productFiltersToSearchString(f);
    expect(parseProductFilters(new URLSearchParams(search))).toEqual(f);
    expect(productFiltersToSearchString(DEFAULT_PRODUCT_FILTERS)).toBe('');
  });

  it('drops unknown or out-of-range values instead of trusting them', () => {
    const f = parseProductFilters(new URLSearchParams('category=weapons&sort=random&min=-5&max=abc&inStock=yes'));
    expect(f).toEqual(DEFAULT_PRODUCT_FILTERS);
    expect(parseProductFilters(new URLSearchParams('min=5000&max=100')).price).toEqual({ min: 5_000, max: null });
  });
});

describe('matchProducts', () => {
  it('never shows hidden products or ones without a photo', () => {
    const result = matchProducts([listing(product('a')), listing(product('b', { available: false })), listing(product('c', { images: [] }))], filters());
    expect(ids(result)).toEqual(['a']);
  });

  it('filters by text (name, description, shop), category, price and stock', () => {
    const all = [
    listing(product('pipe', { name: 'PVC pipe', price: 2_500 })),
    listing(product('tap', { name: 'Brass tap', description: 'Fits any pipe', price: 4_000 })),
    listing(product('lace', { name: 'Lace', category: 'fabrics', price: 9_000 }), shop('s2', { name: 'Pipe Fabrics' })),
    listing(product('none', { name: 'Hammer', category: 'tools', stock: 0 }))];

    expect(ids(matchProducts(all, filters({ query: 'pipe' })))).toEqual(['tap', 'lace', 'pipe']);
    expect(ids(matchProducts(all, filters({ category: 'fabrics' })))).toEqual(['lace']);
    expect(ids(matchProducts(all, filters({ price: { min: 3_000, max: 9_000 } })))).toEqual(['tap', 'lace']);
    expect(ids(matchProducts(all, filters({ inStockOnly: true })))).not.toContain('none');
  });

  it('sorts by price both ways, and keeps closed shops last whatever the sort', () => {
    const all = [
    listing(product('mid', { price: 2_000 })),
    listing(product('cheap', { price: 500 }), shop('closed', { unavailable: { reason: 'Away', until: null } })),
    listing(product('dear', { price: 9_000 }))];

    expect(ids(matchProducts(all, filters({ sort: PRODUCT_SORT.PriceLowToHigh })))).toEqual(['mid', 'dear', 'cheap']);
    expect(ids(matchProducts(all, filters({ sort: PRODUCT_SORT.PriceHighToLow })))).toEqual(['dear', 'mid', 'cheap']);
  });

  it('recommends in-stock items first, then shops serving the place, then better-rated shops', () => {
    const all = [
    listing(product('soldOut', { stock: 0 }), shop('near', { lga: 'Bosso' })),
    listing(product('far'), shop('far', { lga: 'Bida', rating: 5 })),
    listing(product('near'), shop('near', { lga: 'Bosso', rating: 3 })),
    listing(product('serves'), shop('serves', { lga: 'Bida', serviceAreas: ['Bosso'], rating: 4 }))];

    expect(ids(matchProducts(all, filters(), { placeLga: 'Bosso' }))).toEqual(['serves', 'near', 'far', 'soldOut']);
  });
});
