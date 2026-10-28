import Fastify, { type FastifyBaseLogger } from 'fastify'
import type { Logger } from 'pino'
import { registerErrorHandling } from './http/errors.js'
import { registerHealth, type HealthCheck } from './http/health.js'

export interface AppOptions {
  logger: Logger
  healthChecks: { postgres: HealthCheck; redis: HealthCheck }
  healthTimeoutMs?: number
}

/**
 * Builds the API without listening, so tests can drive it with `app.inject()`. server.ts starts it.
 */
export function createApp({ logger, healthChecks, healthTimeoutMs = 1000 }: AppOptions) {
  // Typed as Fastify's base logger so the instance matches the plain FastifyInstance the route modules take.
  const app = Fastify({ loggerInstance: logger as FastifyBaseLogger })
  registerErrorHandling(app)
  registerHealth(app, { checks: healthChecks, timeoutMs: healthTimeoutMs })
  return app
}
