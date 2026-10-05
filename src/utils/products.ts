import { productCategories } from '../data/productCategories';
import type { Product, ProductCategory, StockFilter, StockStatus } from '../types/marketplace';

/** Rules shared by the product form and the spreadsheet import, so both reject the same things. */
export const PRODUCT_NAME_MAX = 80;
export const PRODUCT_DESCRIPTION_MAX = 500;
export const PRODUCT_IMAGES_MAX = 5;
export const PRODUCT_PRICE_MAX = 100_000_000;
export const PRODUCT_STOCK_MAX = 100_000;

export function categoryLabel(id: ProductCategory): string {
  return productCategories.find((c) => c.id === id)?.label ?? 'Other';
}

/** Accepts a label ("Plumbing supplies") or an id ("plumbing_supplies"), any case. */
export function matchCategory(raw: string): ProductCategory | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return null;
  return productCategories.find((c) => c.id === key || c.label.toLowerCase().replace(/[\s-]+/g, '_') === key)?.id ?? null;
}

/** "₦6,500", "6500", "6,500.00" → 6500. Returns null for anything that isn't a plain amount. */
export function parsePrice(raw: string): number | null {
  const cleaned = raw.trim().replace(/^(₦|NGN|N)\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned));
}

export function parseStock(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Blank counts as available, so a template row with the column left empty still imports. */
export function parseAvailable(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (['', 'yes', 'y', 'true', '1', 'available'].includes(v)) return true;
  if (['no', 'n', 'false', '0', 'unavailable'].includes(v)) return false;
  return null;
}

export function isSafeImageUrl(url: string): boolean {
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export type ProductFieldErrors = Partial<Record<'name' | 'category' | 'price' | 'stock' | 'lowStockThreshold' | 'description' | 'images', string>>;

interface ProductFields {
  name: string;
  category: ProductCategory | null;
  price: number | null;
  stock: number | null;
  description: string;
  images: string[];
}

export function validateProductFields(p: ProductFields, { requireImage }: {requireImage: boolean;}): ProductFieldErrors {
  const e: ProductFieldErrors = {};
  const name = p.name.trim();
  if (!name) e.name = 'Name is missing.';else
  if (name.length > PRODUCT_NAME_MAX) e.name = `Name is longer than ${PRODUCT_NAME_MAX} characters.`;
  if (!p.category) e.category = 'Choose a category.';
  if (p.price === null) e.price = 'Price must be a number, like 6500.';else
  if (p.price <= 0) e.price = 'Price must be more than ₦0.';else
  if (p.price > PRODUCT_PRICE_MAX) e.price = 'Price looks too high. Check for extra zeros.';
  if (p.stock === null) e.stock = 'Stock must be a whole number, like 12.';else
  if (p.stock > PRODUCT_STOCK_MAX) e.stock = 'Stock looks too high. Check for extra zeros.';
  if (p.description.trim().length > PRODUCT_DESCRIPTION_MAX) e.description = `Description is longer than ${PRODUCT_DESCRIPTION_MAX} characters.`;
  if (p.images.length > PRODUCT_IMAGES_MAX) e.images = `Use ${PRODUCT_IMAGES_MAX} photos or fewer.`;else
  if (requireImage && p.images.length === 0) e.images = 'Add at least one photo.';
  return e;
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const STOCK_STATUS = {
  inStock: 'in_stock',
  low: 'low_stock',
  out: 'out_of_stock'
} as const satisfies Record<string, StockStatus>;

type StockFields = Pick<Product, 'stock' | 'lowStockThreshold'>;

/** Out of stock wins over low stock, so a threshold of 0 still reports 0 units as out. */
export function getStockStatus({ stock, lowStockThreshold }: StockFields): StockStatus {
  if (stock <= 0) return STOCK_STATUS.out;
  if (stock <= lowStockThreshold) return STOCK_STATUS.low;
  return STOCK_STATUS.inStock;
}

export function matchesStockFilter(product: StockFields, filter: StockFilter): boolean {
  return filter === 'all' || getStockStatus(product) === filter;
}

export interface StockSummary {
  total: number;
  low: number;
  out: number;
}

export function summarizeStock(products: StockFields[]): StockSummary {
  const summary: StockSummary = { total: products.length, low: 0, out: 0 };
  for (const p of products) {
    const status = getStockStatus(p);
    if (status === STOCK_STATUS.low) summary.low += 1;else
    if (status === STOCK_STATUS.out) summary.out += 1;
  }
  return summary;
}

export const clampStock = (n: number) => Math.min(PRODUCT_STOCK_MAX, Math.max(0, n));

/**
 * Checks a typed quantity (stock or low-stock threshold). Returns a message, or null if `raw` is a
 * whole number from 0 to PRODUCT_STOCK_MAX. Negatives and decimals get their own message so the
 * vendor knows what to fix instead of having characters silently dropped.
 */
export function quantityError(raw: string, what = 'Stock'): string | null {
  const v = raw.trim();
  if (!v) return `${what} is missing.`;
  if (v.startsWith('-')) return `${what} can't be negative.`;
  if (/[.]/.test(v)) return `${what} must be a whole number, no decimals.`;
  const n = parseStock(v);
  if (n === null) return `${what} must be a whole number, like 12.`;
  if (n > PRODUCT_STOCK_MAX) return `${what} looks too high. Check for extra zeros.`;
  return null;
}
