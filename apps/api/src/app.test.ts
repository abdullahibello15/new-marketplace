import { errorResponseSchema, healthResponseSchema } from '@zamani/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createApp, type AppOptions } from './app.js'
import { AppError } from './http/errors.js'
import { createLogger } from './observability/logger.js'
import { captureLogs, expectNoSecrets, SECRETS } from './testing/logs.js'

const ok = () => Promise.resolve()
const apps: ReturnType<typeof createApp>[] = []

function build(overrides: Partial<AppOptions> = {}) {
  const logs = captureLogs()
  const app = createApp({
    logger: createLogger({ level: 'info', destination: logs.destination }),
    healthChecks: { postgres: ok, redis: ok },
    healthTimeoutMs: 50,
    ...overrides,
  })
  apps.push(app)
  return { app, logs }
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('GET /healthz', () => {
  it('is 200 when Postgres and Redis answer', async () => {
    const { app } = build()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(healthResponseSchema.parse(res.json())).toEqual({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } })
  })

  it('is 503 when a dependency fails', async () => {
    const { app } = build({
      healthChecks: { postgres: ok, redis: () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:6379')) },
    })
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(503)
    expect(healthResponseSchema.parse(res.json())).toEqual({ status: 'unavailable', checks: { postgres: 'ok', redis: 'down' } })
    expect(res.body).not.toContain('ECONNREFUSED')
  })

  it('is 503 when a dependency hangs past the timeout', async () => {
    const { app } = build({ healthChecks: { postgres: () => new Promise<never>(() => undefined), redis: ok } })
    const started = Date.now()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(Date.now() - started).toBeLessThan(1000)
    expect(res.statusCode).toBe(503)
    expect(res.json().checks).toEqual({ postgres: 'down', redis: 'ok' })
  })
})

describe('error responses', () => {
  it('unknown route: 404 in the standard shape', async () => {
    const { app } = build()
    const res = await app.inject({ method: 'GET', url: '/v1/nope' })
    expect(res.statusCode).toBe(404)
    expect(errorResponseSchema.parse(res.json())).toEqual({
      error: { code: 'not_found', message: 'Not found.', messageKey: 'errors:not_found' },
    })
  })

  it('zod validation error: 400 validation_failed', async () => {
    const { app } = build()
    const body = z.object({ quantity: z.number().int().positive() })
    app.post('/test/validate', async (request) => body.parse(request.body))

    const res = await app.inject({ method: 'POST', url: '/test/validate', payload: { quantity: -1 } })
    expect(res.statusCode).toBe(400)
    expect(errorResponseSchema.parse(res.json()).error).toMatchObject({ code: 'validation_failed', messageKey: 'errors:validation_failed' })
  })

  it('malformed JSON: 400 bad_request in the standard shape', async () => {
    const { app } = build()
    app.post('/test/validate', async () => ({}))
    const res = await app.inject({
      method: 'POST',
      url: '/test/validate',
      headers: { 'content-type': 'application/json' },
      payload: '{"quantity":',
    })
    expect(res.statusCode).toBe(400)
    expect(errorResponseSchema.parse(res.json()).error.code).toBe('bad_request')
  })

  it('AppError: its own status, code and message', async () => {
    const { app } = build()
    app.get('/test/conflict', async () => {
      throw new AppError(409, 'conflict', 'This quote has expired.', 'jobs:guard.quoteExpired')
    })
    const res = await app.inject({ method: 'GET', url: '/test/conflict' })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ error: { code: 'conflict', message: 'This quote has expired.', messageKey: 'jobs:guard.quoteExpired' } })
  })

  it('thrown error: 500 with a generic message, no stack trace or SQL', async () => {
    const { app, logs } = build()
    app.get('/test/boom', async () => {
      throw Object.assign(new Error('syntax error at or near "FROM" in: select password_hash FROM users'), {
        query: 'select password_hash FROM users where phone = $1',
        code: '42601',
      })
    })
    const res = await app.inject({ method: 'GET', url: '/test/boom' })
    expect(res.statusCode).toBe(500)
    expect(errorResponseSchema.parse(res.json())).toEqual({
      error: { code: 'internal', message: 'Something went wrong on our side. Please try again.', messageKey: 'errors:internal' },
    })
    expect(res.body).not.toMatch(/select|password_hash|users|42601|\bat\s|\.ts:\d+/i)
    // The details are kept for us in the log.
    const failed = logs.lines.map((l) => JSON.parse(l)).find((l) => l.msg === 'request failed')
    expect(failed.err.stack).toContain('syntax error')
  })
})

describe('request logging', () => {
  it('never writes credentials, codes or contact details from headers or bodies', async () => {
    const { app, logs } = build()
    app.post('/test/echo', async (request, reply) => {
      request.log.info({ headers: request.headers, body: request.body }, 'echo request')
      reply.header('set-cookie', SECRETS.setCookie)
      request.log.info({ headers: reply.getHeaders() }, 'echo reply')
      return { ok: true }
    })

    const res = await app.inject({
      method: 'POST',
      url: '/test/echo',
      headers: { authorization: SECRETS.authorization, cookie: SECRETS.cookie },
      payload: { password: SECRETS.password, otp: SECRETS.otp, code: SECRETS.code, phone: SECRETS.phone, email: SECRETS.email },
    })
    expect(res.statusCode).toBe(200)
    expect(logs.lines.some((l) => l.includes('echo request'))).toBe(true)
    expectNoSecrets(logs.text())
  })
})
