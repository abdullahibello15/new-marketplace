// Starts the API: `node dist/server.js` (production) or `npm run dev --workspace apps/api`.
import { createApp } from './app.js'
import { RedisRateLimiter } from './auth/service.js'
import { loadEnv, type Env } from './config/env.js'
import { createDb } from './db/client.js'
import { createLogger } from './observability/logger.js'
import { flushSentry, initSentry } from './observability/sentry.js'
import { createRedis } from './redis.js'

let env: Env
try {
  env = loadEnv()
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}

const sentry = initSentry(env)
const logger = createLogger({ level: env.LOG_LEVEL })
const { db, sql } = createDb(env.DATABASE_URL)
const redis = createRedis(env.REDIS_URL, logger)

const delivery = {
  async send(input: { channel: 'sms' | 'email'; destination: string; code: string; purpose: string }) {
    const response = await fetch(env.OTP_DELIVERY_URL as string, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OTP_DELIVERY_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, message: `Your ZAMANI NG MARKET HUB verification code is ${input.code}.` }),
    })
    if (!response.ok) throw new Error(`OTP delivery adapter returned ${response.status}`)
  },
}

const app = createApp({
  logger,
  webOrigin: env.WEB_ORIGIN,
  auth: {
    db,
    rateLimiter: new RedisRateLimiter(redis),
    delivery,
    origin: env.WEB_ORIGIN,
    production: env.NODE_ENV === 'production',
    testOtp: env.NODE_ENV !== 'production' && env.OTP_TEST_MODE === 'true',
  },
  healthChecks: {
    postgres: () => sql`select 1`,
    redis: () => redis.ping(),
  },
})

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'shutting down')
  // If something hangs, exit anyway before the orchestrator's kill timeout.
  setTimeout(() => process.exit(1), 10_000).unref()
  await app.close()
  await Promise.allSettled([sql.end({ timeout: 5 }), redis.quit()])
  await flushSentry()
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

await app.listen({ host: env.HOST, port: env.PORT })
logger.info({ sentry, nodeEnv: env.NODE_ENV, tz: process.env.TZ ?? null }, 'api started')
