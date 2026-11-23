import { sql } from 'drizzle-orm'
import { bigint, boolean, check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { vendors } from './vendors.js'

// The limits live in @zamani/contracts; the CHECK constraints below must match them.
export { MAX_PRODUCT_PRICE_KOBO, MAX_PRODUCT_STOCK } from '@zamani/contracts'

export const vendorProducts = pgTable('vendor_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  priceKobo: bigint('price_kobo', { mode: 'number' }).notNull(),
  stock: integer('stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('vendor_products_vendor_id_idx').on(t.vendorId),
  index('vendor_products_public_idx').on(t.vendorId, t.published),
  check('vendor_products_name_length_check', sql`char_length(${t.name}) between 1 and 80`),
  check('vendor_products_category_check', sql`${t.category} in ('plumbing_supplies', 'electrical_supplies', 'fabrics', 'ready_made_clothing', 'tools', 'building_materials', 'accessories', 'other')`),
  check('vendor_products_description_length_check', sql`char_length(${t.description}) <= 500`),
  check('vendor_products_price_kobo_check', sql`${t.priceKobo} between 1 and 10000000000`),
  check('vendor_products_stock_check', sql`${t.stock} between 0 and 100000`),
  check('vendor_products_low_stock_check', sql`${t.lowStockThreshold} between 0 and 100000`),
])

/** Image references only. This phase has no image upload or file storage path. */
export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => vendorProducts.id, { onDelete: 'cascade' }),
  imageReference: text('image_reference').notNull(),
  altText: text('alt_text').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('product_images_product_id_sort_idx').on(t.productId, t.sortOrder),
  check('product_images_reference_length_check', sql`char_length(${t.imageReference}) between 1 and 2048`),
  check('product_images_alt_length_check', sql`char_length(${t.altText}) <= 200`),
  check('product_images_sort_order_check', sql`${t.sortOrder} between 0 and 4`),
])
