// Starts the API: `node dist/server.js` (production) or `npm run dev --workspace apps/api`.
import { createApp } from './app.js'
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
const { sql } = createDb(env.DATABASE_URL)
const redis = createRedis(env.REDIS_URL, logger)

const app = createApp({
  logger,
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
