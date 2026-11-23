import { z } from 'zod'

export const PUBLIC_DEFAULT_PAGE_SIZE = 20
export const PUBLIC_MAX_PAGE_SIZE = 50

/** Query string for GET /v1/vendors and GET /v1/vendors/:vendorId/reviews. */
export const publicListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  town: z.string().trim().min(1).max(80).optional(),
  lga: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PUBLIC_MAX_PAGE_SIZE).default(PUBLIC_DEFAULT_PAGE_SIZE),
})
export type PublicListQuery = z.input<typeof publicListQuerySchema>

/** Query string for GET /v1/products. */
export const publicProductQuerySchema = publicListQuerySchema
  .extend({
    minPriceKobo: z.coerce.number().int().min(0).optional(),
    maxPriceKobo: z.coerce.number().int().min(0).optional(),
    inStock: z.enum(['true', 'false']).optional(),
  })
  .refine(
    (query) => query.minPriceKobo === undefined || query.maxPriceKobo === undefined || query.maxPriceKobo >= query.minPriceKobo,
  )
export type PublicProductQuery = z.input<typeof publicProductQuerySchema>
