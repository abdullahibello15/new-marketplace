import { productCategories } from '../data/productCategories';
import i18n from '../i18n';
import { csvWithBom, mapTableToRows, type ImportSpec, type SpreadsheetRow } from './spreadsheetImport';
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

export type ImportRow = SpreadsheetRow<ImportColumn>;

const PRODUCT_SPEC: ImportSpec<ImportColumn> = {
  columns: IMPORT_COLUMNS,
  required: REQUIRED_COLUMNS,
  aliases: HEADER_ALIASES,
  maxRows: MAX_IMPORT_ROWS,
  noun: {
    get one() {
      return i18n.t('vendor:products.noun.one');
    },
    get many() {
      return i18n.t('vendor:products.noun.many');
    }
  }
};

export interface RowError {
  column: ImportColumn;
  message: string;
}

export interface RowCheck {
  product: NewProductInput | null;
  errors: RowError[];
  warnings: string[];
}

export function rowsFromTable(table: string[][]): {rows: ImportRow[];ignoredColumns: string[];error?: string;} {
  return mapTableToRows(table, PRODUCT_SPEC);
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
  if (!raw.category.trim()) fail('category', i18n.t('vendor:products.err.categoryMissing'));else
  if (!category) fail('category', i18n.t('vendor:products.err.categoryUnknown', { value: raw.category, list: productCategories.map((c) => c.label).join(', ') }));
  if (!raw.price.trim()) fail('price', i18n.t('vendor:products.err.priceMissing'));else
  if (fieldErrors.price) fail('price', fieldErrors.price);
  if (!raw.stock.trim()) fail('stock', i18n.t('vendor:products.qty.missing', { what: i18n.t('vendor:products.qty.stock') }));else
  if (fieldErrors.stock) fail('stock', fieldErrors.stock);
  if (fieldErrors.description) fail('description', fieldErrors.description);
  if (available === null) fail('available', i18n.t('vendor:products.err.available', { value: raw.available }));
  if (images.length > PRODUCT_IMAGES_MAX) fail('image_urls', i18n.t('vendor:products.err.linksMax', { max: PRODUCT_IMAGES_MAX }));
  const badImage = images.findIndex((u) => !isSafeImageUrl(u));
  if (badImage !== -1) fail('image_urls', i18n.t('vendor:products.err.linkBad', { n: badImage + 1 }));

  const nameKey = raw.name.trim().toLowerCase();
  if (opts.duplicateOf) warnings.push(i18n.t('vendor:products.warn.duplicate', { line: opts.duplicateOf }));
  if (nameKey && opts.existingNames.has(nameKey)) warnings.push(i18n.t('vendor:products.warn.existing'));
  if (images.length === 0) warnings.push(i18n.t('vendor:products.warn.noPhoto'));

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
  return csvWithBom([
  [...IMPORT_COLUMNS],
  ['Kitchen mixer tap (chrome)', 'Plumbing supplies', '9500', '14', 'Single-lever tap with flexible hoses.', 'yes', ''],
  ['LED bulb 15W (pack of 4)', 'Electrical supplies', '4800', '60', 'Cool white, E27 screw base.', 'yes', 'https://example.com/bulb-front.jpg|https://example.com/bulb-box.jpg']]
  );
}
