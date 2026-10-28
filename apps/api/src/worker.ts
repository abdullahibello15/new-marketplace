// Starts the background worker: `node dist/worker.js`. Same image as the API (see the Dockerfile).
import { UnrecoverableError, Worker, type Processor } from 'bullmq'
import { Redis } from 'ioredis'
import { loadEnv, type Env } from './config/env.js'
import { createLogger } from './observability/logger.js'
import { captureError, flushSentry, initSentry } from './observability/sentry.js'

export const QUEUE_NAME = 'default'

// Job handlers by job name. The scheduled tasks in BACKEND_PLAN §4 arrive in Phase 3.
const handlers: Record<string, Processor> = {}

let env: Env
try {
  env = loadEnv()
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}

initSentry(env)
const logger = createLogger({ level: env.LOG_LEVEL })

// BullMQ requires maxRetriesPerRequest: null so its blocking commands wait out reconnects.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
connection.on('error', (err) => logger.warn({ err }, 'redis connection error'))

const worker = new Worker(
  QUEUE_NAME,
  async (job, token) => {
    const handler = handlers[job.name]
    // Unrecoverable: retrying a job nobody handles would only fail again.
    if (!handler) throw new UnrecoverableError(`No handler for job "${job.name}"`)
    return handler(job, token)
  },
  { connection },
)
worker.on('error', (err) => logger.error({ err }, 'worker error'))
worker.on('failed', (job, err) => {
  logger.warn({ err, jobId: job?.id, jobName: job?.name }, 'job failed')
  captureError(err)
})

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'worker shutting down')
  // worker.close() waits for running jobs; give up before the orchestrator's kill timeout.
  setTimeout(() => process.exit(1), 25_000).unref()
  await worker.close()
  await connection.quit()
  await flushSentry()
  logger.info('worker stopped')
  process.exit(0)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

await worker.waitUntilReady()
const redisVersion = /redis_version:(\S+)/.exec(await connection.info('server'))?.[1]
logger.info({ queue: QUEUE_NAME, redisVersion, handlers: Object.keys(handlers) }, 'worker connected to Redis')
