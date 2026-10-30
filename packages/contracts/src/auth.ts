import { z } from 'zod'

export const authSessionSchema = z.object({
  user: z.record(z.string(), z.unknown()),
  accessToken: z.string().optional(),
  accessExpiresAt: z.string().optional(),
  sessionId: z.string().optional(),
})
export type AuthSessionResponse = z.infer<typeof authSessionSchema>

export const otpRequestSchema = z.object({ phone: z.string().min(1) })
export const otpVerifySchema = z.object({ phone: z.string().min(1), code: z.string().length(6), remember: z.boolean().optional() })
export const passwordLoginSchema = z.object({ identifier: z.string().min(1), password: z.string().min(1), remember: z.boolean().optional() })
export const signupSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('customer'), name: z.string(), email: z.string().email(), password: z.string().min(8), language: z.string().optional(), remember: z.boolean().optional() }),
  z.object({ role: z.literal('provider'), name: z.string(), email: z.string().email(), phone: z.string(), lga: z.string(), town: z.string(), acceptedTerms: z.boolean(), password: z.string().min(8), language: z.string().optional(), remember: z.boolean().optional() }),
])
