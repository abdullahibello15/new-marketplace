import { z } from 'zod'

// The one error shape every API route returns (BACKEND_PLAN §4). `message` is English and safe to show;
// `messageKey` is the i18n key the web app translates instead.
export const ERROR_CODES = [
  'bad_request',
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal',
  'unavailable',
] as const

export const errorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string().min(1),
    messageKey: z.string().min(1),
  }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>

/** The i18n key for a code's generic message, e.g. `errors:not_found`. */
export function errorMessageKey(code: ErrorCode): string {
  return `errors:${code}`
}
