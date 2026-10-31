import Fastify, { type FastifyBaseLogger } from 'fastify'
import type { Logger } from 'pino'
import { registerErrorHandling } from './http/errors.js'
import { registerHealth, type HealthCheck } from './http/health.js'
import { registerAuthRoutes, type OtpDelivery, type RateLimiter } from './auth/service.js'
import type { Db } from './db/client.js'
import { registerVendorRoutes } from './vendors/service.js'

export interface AuthOptions {
  db: Db
  rateLimiter: RateLimiter
  delivery: OtpDelivery
  origin: string
  production: boolean
  testOtp: boolean
}

export interface AppOptions {
  logger: Logger
  healthChecks: { postgres: HealthCheck; redis: HealthCheck }
  healthTimeoutMs?: number
  webOrigin: string
  auth?: AuthOptions
}

/**
 * Builds the API without listening, so tests can drive it with `app.inject()`. server.ts starts it.
 */
export function createApp({ logger, healthChecks, healthTimeoutMs = 1000, webOrigin, auth }: AppOptions) {
  // Typed as Fastify's base logger so the instance matches the plain FastifyInstance the route modules take.
  const app = Fastify({ loggerInstance: logger as FastifyBaseLogger, trustProxy: true })
  registerErrorHandling(app)
  registerHealth(app, { checks: healthChecks, timeoutMs: healthTimeoutMs })
  app.addHook('onRequest', async (request, reply) => {
    const requestOrigin = request.headers.origin
    if (requestOrigin === webOrigin) {
      reply.header('access-control-allow-origin', webOrigin)
      reply.header('access-control-allow-credentials', 'true')
      reply.header('access-control-allow-headers', 'content-type, authorization, x-device-id')
      reply.header('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS')
      reply.header('vary', 'Origin')
    }
    if (request.method === 'OPTIONS') return reply.code(requestOrigin === webOrigin ? 204 : 403).send()
  })
  if (auth) {
    void registerAuthRoutes(app, auth)
    registerVendorRoutes(app, auth)
  }
  return app
}
