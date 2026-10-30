import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { MemoryRateLimiter } from './service.js'
import { createDb, type Db } from '../db/client.js'
import { runMigrations } from '../db/migrate.js'
import { createLogger } from '../observability/logger.js'

const ORIGIN = 'https://web.example.test'
let container: StartedPostgreSqlContainer
let db: Db
let sql: ReturnType<typeof createDb>['sql']
let app: ReturnType<typeof createApp>
let sentCode = ''

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:16-3.5').start()
  ;({ db, sql } = createDb(container.getConnectionUri()))
  await runMigrations(db)
  app = createApp({
    logger: createLogger({ level: 'silent' }),
    webOrigin: ORIGIN,
    healthChecks: { postgres: () => Promise.resolve(), redis: () => Promise.resolve() },
    auth: {
      db,
      rateLimiter: new MemoryRateLimiter(),
      origin: ORIGIN,
      production: true,
      testOtp: false,
      delivery: { send: async ({ code }) => { sentCode = code } },
    },
  })
})

afterAll(async () => {
  await app?.close()
  await sql?.end()
  await container?.stop()
})

describe('auth API endpoints', () => {
  it('supports OTP, signup, password login, session refresh/logout and password reset', async () => {
    const otpRequest = await app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { phone: '08030000001' } })
    expect(otpRequest.statusCode).toBe(200)
    expect(otpRequest.json().phone).toBe('+2348030000001')
    const otpVerify = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { phone: '08030000001', code: sentCode } })
    expect(otpVerify.json().status).toBe('new_user')
    const riderSignup = await app.inject({ method: 'POST', url: '/v1/auth/signup/phone', payload: { signupToken: otpVerify.json().signupToken, role: 'rider', name: 'Rider Example' } })
    expect(riderSignup.statusCode).toBe(201)
    expect(riderSignup.json().user.roles).toContain('rider')

    const signup = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: { role: 'customer', name: 'Aisha Example', email: 'aisha@example.test', password: 'SafePassword!23' },
    })
    expect(signup.statusCode).toBe(201)
    expect(signup.json().user.email).toBe('aisha@example.test')
    const refreshCookie = signup.headers['set-cookie'] as string
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toContain('SameSite=None')
    expect(refreshCookie).toContain('Secure')

    const login = await app.inject({
      method: 'POST', url: '/v1/auth/login',
      payload: { identifier: 'aisha@example.test', password: 'SafePassword!23' },
    })
    expect(login.statusCode).toBe(200)
    const bearer = login.json().accessToken as string
    const session = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: `Bearer ${bearer}` } })
    expect(session.statusCode).toBe(200)
    expect(session.json().user.id).toBe(login.json().user.id)

    const activeCookie = login.headers['set-cookie'] as string
    const refreshed = await app.inject({ method: 'POST', url: '/v1/auth/refresh', headers: { cookie: activeCookie.split(';')[0] } })
    expect(refreshed.statusCode).toBe(200)
    expect(refreshed.json().accessToken).toBeTruthy()
    const logout = await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { cookie: (refreshed.headers['set-cookie'] as string).split(';')[0] } })
    expect(logout.statusCode).toBe(204)

    const resetRequest = await app.inject({ method: 'POST', url: '/v1/auth/password-reset/request', payload: { identifier: 'aisha@example.test' } })
    expect(resetRequest.statusCode).toBe(200)
    expect(resetRequest.json().channel).toBe('email')
    const resetVerify = await app.inject({ method: 'POST', url: '/v1/auth/password-reset/verify', payload: { identifier: 'aisha@example.test', code: sentCode } })
    expect(resetVerify.statusCode).toBe(200)
    const reset = await app.inject({ method: 'POST', url: '/v1/auth/password-reset/complete', payload: { resetToken: resetVerify.json().resetToken, newPassword: 'DifferentPassword!24' } })
    expect(reset.statusCode).toBe(200)
    expect(reset.json()).toEqual({ status: 'go_to_login' })
    const loginAfterReset = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { identifier: 'aisha@example.test', password: 'DifferentPassword!24' } })
    expect(loginAfterReset.statusCode).toBe(200)
  })

  it('limits OTP, login and password reset by both IP and normalized contact', async () => {
    const calls = await Promise.all(Array.from({ length: 6 }, () => app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { phone: '08030000002' } })))
    // OTP resend cooldown can reject concurrent repeat requests before the counter limit.
    expect(calls.some((response) => response.statusCode === 429)).toBe(true)
    const ipCalls = await Promise.all(Array.from({ length: 21 }, (_, index) => app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { phone: `0803001${String(index).padStart(4, '0')}` } })))
    expect(ipCalls.some((response) => response.statusCode === 429)).toBe(true)
    const loginCalls = await Promise.all(Array.from({ length: 9 }, () => app.inject({ method: 'POST', url: '/v1/auth/login', payload: { identifier: 'limited@example.test', password: 'bad' } })))
    expect(loginCalls.filter((response) => response.statusCode === 429).length).toBeGreaterThan(0)
    const resetCalls = await Promise.all(Array.from({ length: 6 }, () => app.inject({ method: 'POST', url: '/v1/auth/password-reset/request', payload: { identifier: 'limited@example.test' } })))
    expect(resetCalls.filter((response) => response.statusCode === 429).length).toBeGreaterThan(0)
  })

  it('allows credentialed CORS for the exact configured origin only', async () => {
    const allowed = await app.inject({ method: 'OPTIONS', url: '/v1/auth/login', headers: { origin: ORIGIN } })
    expect(allowed.statusCode).toBe(204)
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN)
    expect(allowed.headers['access-control-allow-credentials']).toBe('true')
    const rejected = await app.inject({ method: 'OPTIONS', url: '/v1/auth/login', headers: { origin: 'https://attacker.example' } })
    expect(rejected.statusCode).toBe(403)
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined()
  })
})
