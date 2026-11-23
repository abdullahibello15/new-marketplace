import { z } from 'zod'

/** Money is whole kobo (BACKEND_PLAN §3). ₦100,000,000. */
export const MAX_PRODUCT_PRICE_KOBO = 10_000_000_000
export const MAX_PRODUCT_STOCK = 100_000
export const MAX_PRODUCT_IMPORT_ROWS = 100

export const PRODUCT_CATEGORIES = [
  'plumbing_supplies',
  'electrical_supplies',
  'fabrics',
  'ready_made_clothing',
  'tools',
  'building_materials',
  'accessories',
  'other',
] as const
export type ProductCategoryId = (typeof PRODUCT_CATEGORIES)[number]

const productFields = {
  name: z.string().trim().min(1).max(80),
  category: z.enum(PRODUCT_CATEGORIES),
  description: z.string().trim().max(500),
  priceKobo: z.number().int().positive().max(MAX_PRODUCT_PRICE_KOBO),
  stock: z.number().int().min(0).max(MAX_PRODUCT_STOCK),
  lowStockThreshold: z.number().int().min(0).max(MAX_PRODUCT_STOCK),
  published: z.boolean(),
}

/** POST /v1/vendors/me/products, and each row of the import. No `images` yet: there is no file storage. */
export const createProductSchema = z
  .object({
    ...productFields,
    description: productFields.description.default(''),
    stock: productFields.stock.default(0),
    lowStockThreshold: productFields.lowStockThreshold.default(5),
    published: productFields.published.default(false),
  })
  .strict()
export type CreateProductInput = z.input<typeof createProductSchema>

/** PATCH /v1/vendors/me/products/:productId. At least one field. */
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0)
export type UpdateProductInput = z.input<typeof updateProductSchema>

export const productParamsSchema = z.object({ productId: z.string().uuid() })

/** One element of the POST /v1/vendors/me/products/import body (an array of 1–MAX_PRODUCT_IMPORT_ROWS). */
export const productImportEnvelopeSchema = z
  .object({
    sourceRow: z.number().int().min(1),
    product: z.unknown(),
  })
  .strict()

export interface ProductImportRowError {
  row: number
  field: string
  message: string
}

/** A vendor's own product as the API returns it. */
export interface VendorProductResource {
  id: string
  name: string
  category: ProductCategoryId
  description: string
  priceKobo: number
  stock: number
  lowStockThreshold: number
  published: boolean
}
