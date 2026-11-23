import { z } from 'zod'

const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const VENDOR_KINDS = ['service', 'retail'] as const
export type VendorKind = (typeof VENDOR_KINDS)[number]

export const TRADE_CATEGORIES = [
  'plumber',
  'electrician',
  'tailor',
  'dispatch_rider',
  'grocer',
  'carpenter',
  'mechanic',
  'painter',
  'hair_stylist',
  'other',
] as const
export type TradeCategoryId = (typeof TRADE_CATEGORIES)[number]

/** POST /v1/vendors/setup, and the business part of provider signup. */
export const vendorSetupSchema = z
  .object({
    kind: z.enum(VENDOR_KINDS),
    businessName: z.string().trim().min(2).max(80),
    tradeCategory: z.enum(TRADE_CATEGORIES),
  })
  .strict()
  .superRefine((value, context) => {
    const retail = value.tradeCategory === 'grocer'
    if ((retail ? 'retail' : 'service') !== value.kind) {
      context.addIssue({ code: 'custom', path: ['tradeCategory'], message: 'The trade category does not match the business type.' })
    }
    if (emailLike.test(value.businessName)) {
      context.addIssue({ code: 'custom', path: ['businessName'], message: 'Enter a business name, not an email address.' })
    }
  })
export type VendorSetupInput = z.input<typeof vendorSetupSchema>

/** PATCH /v1/vendors/me. Every field is optional; unknown fields are rejected. */
export const vendorProfilePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    photo: z.string().max(2048),
    bio: z.string().max(300),
    tradeCategory: z.enum(TRADE_CATEGORIES),
    tradeCategoryOther: z.string().max(40),
    gallery: z
      .array(
        z
          .string()
          .max(2048)
          .refine((value) => {
            if (/^storage:\/\/[A-Za-z0-9][A-Za-z0-9._/-]{0,2040}$/.test(value)) return true
            try {
              return new URL(value).protocol === 'https:' && Boolean(new URL(value).hostname)
            } catch {
              return false
            }
          }, 'Gallery entries must be HTTPS URLs or storage references.'),
      )
      .max(10),
    services: z.array(z.record(z.string(), z.unknown())).max(30),
    workingHours: z.record(z.string(), z.unknown()),
    serviceAreas: z.array(z.string().max(100)).max(50),
    fulfilment: z.record(z.string(), z.unknown()),
    acceptsCash: z.boolean(),
  })
  .partial()
  .strict()
export type VendorProfilePatch = z.input<typeof vendorProfilePatchSchema>
