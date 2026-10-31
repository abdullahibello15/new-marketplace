import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { MemoryRateLimiter } from './service.js'
import { and, eq } from 'drizzle-orm'
import { createDb, type Db } from '../db/client.js'
import { runMigrations } from '../db/migrate.js'
import { otpChallenges, sessions, userRoles, users, vendors } from '../db/schema/index.js'
import { createLogger } from '../observability/logger.js'
import { captureLogs } from '../testing/logs.js'

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
  it('creates a provider and vendor together, then verifies email without ending the session', async () => {
    const response = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: {
        role: 'provider', name: 'Musa Workshop Owner', email: 'musa-workshop@example.test', phone: '08030000121',
        lga: 'Bosso', town: 'Maitumbi', acceptedTerms: true, password: 'SafePassword!23',
        kind: 'service', businessName: 'Musa Workshop', tradeCategory: 'carpenter',
      },
    })
    expect(response.statusCode).toBe(201)
    const signedUp = response.json()
    expect(signedUp.user).toMatchObject({ roles: ['provider'], vendorId: expect.any(String), providerSignup: null })
    const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerUserId, signedUp.user.id))
    expect(vendor).toMatchObject({
      id: signedUp.user.vendorId, businessName: 'Musa Workshop', kind: 'service', tradeCategory: 'carpenter',
      town: 'Maitumbi', lga: 'Bosso', status: 'pending', verificationStatus: 'unverified',
    })
    expect((await db.select().from(userRoles).where(eq(userRoles.userId, signedUp.user.id))).map((item) => item.role)).toEqual(['provider'])
    expect((await db.select().from(sessions).where(eq(sessions.userId, signedUp.user.id))).length).toBe(1)

    const authorization = `Bearer ${signedUp.accessToken}`
    const codeSent = await app.inject({ method: 'POST', url: '/v1/auth/email/code', headers: { authorization } })
    expect(codeSent.statusCode).toBe(200)
    const verified = await app.inject({ method: 'POST', url: '/v1/auth/email/verify', headers: { authorization }, payload: { code: sentCode } })
    expect(verified.statusCode).toBe(200)
    expect(verified.json().user).toMatchObject({ id: signedUp.user.id, vendorId: signedUp.user.vendorId, emailVerified: true })
    const stillSignedIn = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization } })
    expect(stillSignedIn.statusCode).toBe(200)
    expect(stillSignedIn.json().user).toMatchObject({ vendorId: signedUp.user.vendorId, emailVerified: true })
  })

  it('does not issue a session to a provider who has no vendor profile', async () => {
    const phone = '+2348030000123'
    const [orphan] = await db.insert(users).values({
      name: 'Old Provider', email: 'old-provider@example.test', phone, activeRole: 'provider',
    }).returning()
    await db.insert(userRoles).values({ userId: orphan.id, role: 'provider' })
    const requested = await app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { phone } })
    expect(requested.statusCode).toBe(200)

    const login = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { phone, code: sentCode } })
    expect(login.statusCode).toBe(409)
    expect(login.json().error.message).toContain('missing its vendor profile')
    expect(login.headers['set-cookie']).toContain('Max-Age=0')
    expect(await db.select().from(sessions).where(eq(sessions.userId, orphan.id))).toHaveLength(0)
  })

  it('documents null vendorId from refresh and email verification for a provider without a vendor row', async () => {
    const signup = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: {
        role: 'provider', name: 'Vendorless Provider', email: 'vendorless-refresh@example.test', phone: '08030000129',
        lga: 'Bosso', town: 'Maitumbi', acceptedTerms: true, password: 'SafePassword!23',
        kind: 'service', businessName: 'Vendorless Workshop', tradeCategory: 'carpenter',
      },
    })
    expect(signup.statusCode).toBe(201)
    const signedUp = signup.json()
    await db.delete(vendors).where(eq(vendors.ownerUserId, signedUp.user.id))
    const cookie = signup.headers['set-cookie']
    const refresh = await app.inject({ method: 'POST', url: '/v1/auth/refresh', headers: { cookie } })
    expect(refresh.statusCode).toBe(200)
    expect(refresh.json().user).toMatchObject({ id: signedUp.user.id, vendorId: null })

    const authorization = `Bearer ${refresh.json().accessToken}`
    const requestCode = await app.inject({ method: 'POST', url: '/v1/auth/email/code', headers: { authorization } })
    expect(requestCode.statusCode).toBe(200)
    const verify = await app.inject({ method: 'POST', url: '/v1/auth/email/verify', headers: { authorization }, payload: { code: sentCode } })
    expect(verify.statusCode).toBe(200)
    expect(verify.json().user).toMatchObject({ id: signedUp.user.id, vendorId: null, emailVerified: true })
  })

  it('rolls back provider, role and session when vendor insertion fails', async () => {
    await sql.unsafe(`CREATE OR REPLACE FUNCTION fail_vendor_signup_insert() RETURNS trigger AS $$
      BEGIN
        IF NEW.business_name = 'Rollback Test Workshop' THEN RAISE EXCEPTION 'forced vendor insert failure'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`)
    await sql.unsafe('CREATE TRIGGER fail_vendor_signup_insert_trigger BEFORE INSERT ON vendors FOR EACH ROW EXECUTE FUNCTION fail_vendor_signup_insert()')
    try {
      const response = await app.inject({
        method: 'POST', url: '/v1/auth/signup',
        payload: {
          role: 'provider', name: 'Rollback Test Owner', email: 'rollback-provider@example.test', phone: '08030000122',
          lga: 'Bosso', town: 'Maitumbi', acceptedTerms: true, password: 'SafePassword!23',
          kind: 'service', businessName: 'Rollback Test Workshop', tradeCategory: 'carpenter',
        },
      })
      expect(response.statusCode).toBeGreaterThanOrEqual(500)
      const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'rollback-provider@example.test'))
      expect(account).toBeUndefined()
      const [role] = await db.select({ role: userRoles.role }).from(userRoles).innerJoin(users, eq(userRoles.userId, users.id)).where(eq(users.email, 'rollback-provider@example.test'))
      expect(role).toBeUndefined()
      const [session] = await db.select({ id: sessions.id }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(eq(users.email, 'rollback-provider@example.test'))
      expect(session).toBeUndefined()
    } finally {
      await sql.unsafe('DROP TRIGGER IF EXISTS fail_vendor_signup_insert_trigger ON vendors')
      await sql.unsafe('DROP FUNCTION IF EXISTS fail_vendor_signup_insert()')
    }
  })

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

  it('requests and verifies email codes with the authenticated user session', async () => {
    const signup = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: { role: 'customer', name: 'Email Verify User', email: 'email-verify@example.test', password: 'SafePassword!23' },
    })
    const authorization = `Bearer ${signup.json().accessToken}`
    const sent = await app.inject({ method: 'POST', url: '/v1/auth/email/code', headers: { authorization } })
    expect(sent.statusCode).toBe(200)
    expect(sent.json()).toMatchObject({ target: 'email-verify@example.test', devCode: null, user: { emailVerified: false } })
    expect(new Date(sent.json().expiresAt).getTime() - Date.now()).toBeGreaterThan(9 * 60_000)
    expect(new Date(sent.json().expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(10 * 60_000)
    const [challenge] = await db.select().from(otpChallenges).where(and(
      eq(otpChallenges.destination, 'email-verify@example.test'),
      eq(otpChallenges.purpose, `verify-email:${signup.json().user.id}`),
    ))
    expect(challenge.codeHash).not.toBe(sentCode)
    const verified = await app.inject({
      method: 'POST', url: '/v1/auth/email/verify', headers: { authorization }, payload: { code: sentCode },
    })
    expect(verified.statusCode).toBe(200)
    expect(verified.json().user).toMatchObject({ email: 'email-verify@example.test', emailVerified: true })
  })

  it('requests and verifies phone codes with the authenticated user session', async () => {
    const signup = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: { role: 'customer', name: 'Phone Verify User', email: 'phone-verify@example.test', password: 'SafePassword!23' },
    })
    const authorization = `Bearer ${signup.json().accessToken}`
    const sent = await app.inject({
      method: 'POST', url: '/v1/auth/phone/code', headers: { authorization }, payload: { phone: '08030000031' },
    })
    expect(sent.statusCode).toBe(200)
    expect(sent.json()).toMatchObject({ target: '+2348030000031', devCode: null, user: { phone: '+2348030000031', phoneVerified: false } })
    expect(new Date(sent.json().expiresAt).getTime() - Date.now()).toBeGreaterThan(9 * 60_000)
    expect(new Date(sent.json().expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(10 * 60_000)
    const [challenge] = await db.select().from(otpChallenges).where(and(
      eq(otpChallenges.destination, '+2348030000031'),
      eq(otpChallenges.purpose, `verify-phone:${signup.json().user.id}`),
    ))
    expect(challenge.codeHash).not.toBe(sentCode)
    const verified = await app.inject({
      method: 'POST', url: '/v1/auth/phone/verify', headers: { authorization }, payload: { code: sentCode },
    })
    expect(verified.statusCode).toBe(200)
    expect(verified.json().user).toMatchObject({ phone: '+2348030000031', phoneVerified: true })
  })

  it('requires a bearer session for every contact-verification endpoint', async () => {
    const requests = [
      app.inject({ method: 'POST', url: '/v1/auth/email/code' }),
      app.inject({ method: 'POST', url: '/v1/auth/email/verify', payload: { code: '123456' } }),
      app.inject({ method: 'POST', url: '/v1/auth/phone/code', payload: { phone: '08030000041' } }),
      app.inject({ method: 'POST', url: '/v1/auth/phone/verify', payload: { code: '123456' } }),
    ]
    expect((await Promise.all(requests)).map((response) => response.statusCode)).toEqual([401, 401, 401, 401])
  })

  it('never logs OTP codes in production', async () => {
    const logs = captureLogs()
    let deliveredCode = ''
    const productionApp = createApp({
      logger: createLogger({ level: 'info', destination: logs.destination }),
      webOrigin: ORIGIN,
      healthChecks: { postgres: () => Promise.resolve(), redis: () => Promise.resolve() },
      auth: {
        db,
        rateLimiter: new MemoryRateLimiter(),
        origin: ORIGIN,
        production: true,
        testOtp: false,
        delivery: { send: async ({ code }) => { deliveredCode = code } },
      },
    })
    try {
      const response = await productionApp.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { phone: '08039999991' } })
      expect(response.statusCode).toBe(200)
      expect(deliveredCode).toMatch(/^\d{6}$/)
      expect(logs.text()).not.toContain(deliveredCode)
    } finally {
      await productionApp.close()
    }
  })

  it('stops email verification after five incorrect code attempts', async () => {
    const signup = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: { role: 'customer', name: 'Wrong Code User', email: 'wrong-code@example.test', password: 'SafePassword!23' },
    })
    const authorization = `Bearer ${signup.json().accessToken}`
    await app.inject({ method: 'POST', url: '/v1/auth/email/code', headers: { authorization } })
    for (let attempt = 0; attempt < 5; attempt++) {
      const wrong = await app.inject({ method: 'POST', url: '/v1/auth/email/verify', headers: { authorization }, payload: { code: '000000' } })
      expect(wrong.statusCode).toBe(400)
    }
    const locked = await app.inject({ method: 'POST', url: '/v1/auth/email/verify', headers: { authorization }, payload: { code: '000000' } })
    expect(locked.statusCode).toBe(429)
  })

  it('rate limits phone code sends per signed-in user', async () => {
    const signup = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: { role: 'customer', name: 'Rate Limit User', email: 'contact-limit@example.test', password: 'SafePassword!23' },
    })
    const authorization = `Bearer ${signup.json().accessToken}`
    const statuses: number[] = []
    for (let index = 0; index < 6; index++) {
      const response = await app.inject({
        method: 'POST', url: '/v1/auth/phone/code', headers: { authorization },
        payload: { phone: `0803100000${index}` },
      })
      statuses.push(response.statusCode)
    }
    expect(statuses.filter((status) => status === 200)).toHaveLength(5)
    expect(statuses.filter((status) => status === 429)).toHaveLength(1)
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
