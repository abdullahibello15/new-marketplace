import { z } from 'zod'

// Optional values arrive as "" when a compose file or shell sets `NAME=` with nothing after it.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional())

// Read once at startup; a missing or malformed value stops the process with a clear message.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  // Error reporting is off unless a DSN is set.
  SENTRY_DSN: optional(z.url()),
  SENTRY_ENVIRONMENT: optional(z.string()),
  // Accepts the fixed test code for one-time codes (Phase 1). Never in production: see loadEnv.
  OTP_TEST_MODE: optional(z.enum(['true', 'false'])),
})

export type Env = z.infer<typeof schema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid API environment (see apps/api/.env.example):\n${problems}`)
  }
  // Refused when present at all, even empty or "false": production config should not mention test mode.
  if (parsed.data.NODE_ENV === 'production' && source.OTP_TEST_MODE !== undefined) {
    throw new Error('Invalid API environment: OTP_TEST_MODE must not be set when NODE_ENV=production')
  }
  return parsed.data
}
