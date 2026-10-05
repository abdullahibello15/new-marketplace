import { productCategories } from '../data/productCategories';
import { BOM, toCsv } from './csv';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  PRODUCT_IMAGES_MAX,
  isSafeImageUrl,
  matchCategory,
  parseAvailable,
  parsePrice,
  parseStock,
  validateProductFields } from
'./products';
import type { NewProductInput } from '../types/marketplace';

export const IMPORT_COLUMNS = ['name', 'category', 'price', 'stock', 'description', 'available', 'image_urls'] as const;
export type ImportColumn = typeof IMPORT_COLUMNS[number];
const REQUIRED_COLUMNS: ImportColumn[] = ['name', 'category', 'price', 'stock'];
export const MAX_IMPORT_ROWS = 500;

/** Common header spellings vendors use, mapped to our columns. */
const HEADER_ALIASES: Record<string, ImportColumn> = {
  product: 'name',
  product_name: 'name',
  item: 'name',
  price_ngn: 'price',
  'price_(₦)': 'price',
  'price_₦': 'price',
  quantity: 'stock',
  qty: 'stock',
  stock_quantity: 'stock',
  images: 'image_urls',
  image_url: 'image_urls',
  image: 'image_urls',
  photos: 'image_urls'
};

export type RawProductRow = Record<ImportColumn, string>;

export interface ImportRow {
  id: string;
  /** Row number as the vendor sees it in their spreadsheet (header is row 1 or later). */
  line: number;
  raw: RawProductRow;
  skipped: boolean;
}

export interface RowError {
  column: ImportColumn;
  message: string;
}

export interface RowCheck {
  product: NewProductInput | null;
  errors: RowError[];
  warnings: string[];
}

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_');

export function rowsFromTable(table: string[][]): {rows: ImportRow[];ignoredColumns: string[];error?: string;} {
  const headerIndex = table.findIndex((r) => r.some((c) => c.trim()));
  if (headerIndex === -1) return { rows: [], ignoredColumns: [], error: 'This file is empty.' };

  const header = table[headerIndex];
  const columnAt = new Map<ImportColumn, number>();
  const ignoredColumns: string[] = [];
  header.forEach((h, i) => {
    const key = normalizeHeader(h);
    const column = (IMPORT_COLUMNS as readonly string[]).includes(key) ? key as ImportColumn : HEADER_ALIASES[key];
    if (column && !columnAt.has(column)) columnAt.set(column, i);else
    if (h.trim()) ignoredColumns.push(h.trim());
  });

  const missing = REQUIRED_COLUMNS.filter((c) => !columnAt.has(c));
  if (missing.length) {
    return {
      rows: [],
      ignoredColumns,
      error: `Missing ${missing.length === 1 ? 'column' : 'columns'}: ${missing.join(', ')}. Download the template to see the expected columns.`
    };
  }

  const rows: ImportRow[] = [];
  table.slice(headerIndex + 1).forEach((cells, i) => {
    if (!cells.some((c) => c.trim())) return;
    const raw = Object.fromEntries(
      IMPORT_COLUMNS.map((c) => {
        const index = columnAt.get(c);
        return [c, index === undefined ? '' : (cells[index] ?? '').trim()];
      })
    ) as RawProductRow;
    const line = headerIndex + i + 2;
    rows.push({ id: `row-${line}`, line, raw, skipped: false });
  });

  if (rows.length === 0) return { rows, ignoredColumns, error: 'No products found under the header row.' };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { rows: [], ignoredColumns, error: `This file has ${rows.length} products. Import up to ${MAX_IMPORT_ROWS} at a time.` };
  }
  return { rows, ignoredColumns };
}

export const splitImageUrls = (raw: string) => raw.split(/[|\s]+/).filter(Boolean);

/**
 * Validates one row. Errors block the row; warnings don't.
 * `duplicateOf` is the spreadsheet row number of an earlier row with the same name, if any.
 */
export function checkRow(raw: RawProductRow, opts: {existingNames: Set<string>;duplicateOf?: number;}): RowCheck {
  const errors: RowError[] = [];
  const warnings: string[] = [];
  const fail = (column: ImportColumn, message: string) => errors.push({ column, message });

  const category = matchCategory(raw.category);
  const price = parsePrice(raw.price);
  const stock = parseStock(raw.stock);
  const available = parseAvailable(raw.available);
  const images = splitImageUrls(raw.image_urls);

  const fieldErrors = validateProductFields(
    { name: raw.name, category, price, stock, description: raw.description, images },
    { requireImage: false }
  );
  if (fieldErrors.name) fail('name', fieldErrors.name);
  if (!raw.category.trim()) fail('category', 'Category is missing.');else
  if (!category) fail('category', `“${raw.category}” isn’t a category. Use one of: ${productCategories.map((c) => c.label).join(', ')}.`);
  if (!raw.price.trim()) fail('price', 'Price is missing.');else
  if (fieldErrors.price) fail('price', fieldErrors.price);
  if (!raw.stock.trim()) fail('stock', 'Stock is missing.');else
  if (fieldErrors.stock) fail('stock', fieldErrors.stock);
  if (fieldErrors.description) fail('description', fieldErrors.description);
  if (available === null) fail('available', `Available must be yes or no, not “${raw.available}”.`);
  if (images.length > PRODUCT_IMAGES_MAX) fail('image_urls', `Use ${PRODUCT_IMAGES_MAX} image links or fewer.`);
  const badImage = images.findIndex((u) => !isSafeImageUrl(u));
  if (badImage !== -1) fail('image_urls', `Image link ${badImage + 1} isn’t a web address (it should start with https://).`);

  const nameKey = raw.name.trim().toLowerCase();
  if (opts.duplicateOf) warnings.push(`Same name as row ${opts.duplicateOf}.`);
  if (nameKey && opts.existingNames.has(nameKey)) warnings.push('You already have a product with this name. This adds another.');
  if (images.length === 0) warnings.push('No photo yet. It will be imported as unavailable until you add one.');

  const product: NewProductInput | null =
  errors.length === 0 && category && price !== null && stock !== null ?
  {
    name: raw.name.trim(),
    category,
    price,
    stock,
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    description: raw.description.trim(),
    images,
    available: images.length > 0 && available !== false
  } :
  null;

  return { product, errors, warnings };
}

export function buildTemplateCsv(): string {
  // BOM so Excel opens the file as UTF-8 and keeps characters like ₦ intact.
  return BOM + toCsv([
  [...IMPORT_COLUMNS],
  ['Kitchen mixer tap (chrome)', 'Plumbing supplies', '9500', '14', 'Single-lever tap with flexible hoses.', 'yes', ''],
  ['LED bulb 15W (pack of 4)', 'Electrical supplies', '4800', '60', 'Cool white, E27 screw base.', 'yes', 'https://example.com/bulb-front.jpg|https://example.com/bulb-box.jpg']]
  ) + '\r\n';
}
