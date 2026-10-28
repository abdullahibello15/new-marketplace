import type { HealthResponse } from '@zamani/contracts'
import type { FastifyInstance } from 'fastify'

export type HealthCheck = () => PromiseLike<unknown>

export interface HealthOptions {
  checks: Record<string, HealthCheck>
  /** Each check gets this long before it counts as down. */
  timeoutMs: number
}

function withTimeout(promise: PromiseLike<unknown>, ms: number): Promise<unknown> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function registerHealth(app: FastifyInstance, { checks, timeoutMs }: HealthOptions): void {
  // logLevel "warn": probes every few seconds would otherwise fill the log with request lines.
  app.get('/healthz', { logLevel: 'warn' }, async (request, reply): Promise<HealthResponse> => {
    const results = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          await withTimeout(check(), timeoutMs)
          return [name, 'ok'] as const
        } catch (err) {
          request.log.warn({ err, check: name }, 'health check failed')
          return [name, 'down'] as const
        }
      }),
    )
    const healthy = results.every(([, status]) => status === 'ok')
    reply.code(healthy ? 200 : 503).header('cache-control', 'no-store')
    return { status: healthy ? 'ok' : 'unavailable', checks: Object.fromEntries(results) }
  })
}
