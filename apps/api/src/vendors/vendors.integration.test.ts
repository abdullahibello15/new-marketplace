import { createHash, randomBytes } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { createDb, type Db } from '../db/client.js'
import { runMigrations } from '../db/migrate.js'
import { sessions, userRoles, users, vendors } from '../db/schema/index.js'
import { createLogger } from '../observability/logger.js'
import { MemoryRateLimiter } from '../auth/service.js'

let container: StartedPostgreSqlContainer
let db: Db
let sql: ReturnType<typeof createDb>['sql']
let app: ReturnType<typeof createApp>
const accessTokens = new Map<string, string>()
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

async function account(role: 'provider' | 'customer' = 'provider', town = 'Tunga') {
  const id = crypto.randomUUID()
  const accessToken = randomBytes(32).toString('base64url')
  const [user] = await db.insert(users).values({
    id, name: `Vendor Test ${id.slice(0, 6)}`, email: `${id}@example.test`, activeRole: role,
    providerSignup: role === 'provider' ? { lga: 'Agwara', town, termsAcceptedAt: new Date().toISOString() } : null,
  }).returning()
  await db.insert(userRoles).values({ userId: id, role })
  await db.insert(sessions).values({
    userId: id, refreshTokenHash: hash(`refresh-${id}`), accessTokenHash: hash(accessToken),
    accessExpiresAt: new Date(Date.now() + 60 * 60_000), expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  })
  accessTokens.set(id, accessToken)
  return { user, authorization: `Bearer ${accessToken}` }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:16-3.5').start()
  ;({ db, sql } = createDb(container.getConnectionUri()))
  await runMigrations(db)
  app = createApp({
    logger: createLogger({ level: 'silent' }),
    webOrigin: 'https://web.example.test',
    healthChecks: { postgres: () => Promise.resolve(), redis: () => Promise.resolve() },
    auth: {
      db,
      rateLimiter: new MemoryRateLimiter(),
      origin: 'https://web.example.test',
      production: true,
      testOtp: false,
      delivery: { send: async () => undefined },
    },
  })
})

afterAll(async () => {
  await app?.close()
  await sql?.end()
  await container?.stop()
})

describe('vendor setup and profile API', () => {
  it('creates one pending vendor and synchronizes users.vendor_id transactionally', async () => {
    const provider = await account()
    const response = await app.inject({
      method: 'POST', url: '/v1/vendors/setup', headers: { authorization: provider.authorization },
      payload: { kind: 'service', businessName: 'Musa Workshop', tradeCategory: 'carpenter' },
    })
    expect(response.statusCode).toBe(201)
    const vendorId = response.json().vendorId as string
    const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerUserId, provider.user.id))
    const [updatedUser] = await db.select().from(users).where(eq(users.id, provider.user.id))
    expect(vendor).toMatchObject({ id: vendorId, status: 'pending', verificationStatus: 'unverified', town: 'Tunga', lga: 'Agwara' })
    expect(updatedUser.vendorId).toBe(vendor.id)
  })

  it('returns 409 for duplicate setup', async () => {
    const provider = await account()
    const payload = { kind: 'service', businessName: 'Single Profile', tradeCategory: 'plumber' }
    const first = await app.inject({ method: 'POST', url: '/v1/vendors/setup', headers: { authorization: provider.authorization }, payload })
    const second = await app.inject({ method: 'POST', url: '/v1/vendors/setup', headers: { authorization: provider.authorization }, payload })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(409)
  })

  it('rejects non-providers and unauthenticated callers', async () => {
    const customer = await account('customer')
    const forbidden = await app.inject({ method: 'GET', url: '/v1/vendors/me', headers: { authorization: customer.authorization } })
    const anonymous = await app.inject({ method: 'GET', url: '/v1/vendors/me' })
    expect(forbidden.statusCode).toBe(403)
    expect(anonymous.statusCode).toBe(401)
  })

  it('validates setup name, kind, category, and town', async () => {
    for (const testCase of [
      { town: 'name@example.test', payload: { kind: 'service', businessName: 'Valid Name', tradeCategory: 'plumber' } },
      { town: 'Tunga', payload: { kind: 'service', businessName: 'x', tradeCategory: 'plumber' } },
      { town: 'Tunga', payload: { kind: 'invalid', businessName: 'Valid Name', tradeCategory: 'plumber' } },
      { town: 'Tunga', payload: { kind: 'service', businessName: 'Valid Name', tradeCategory: 'unknown' } },
    ]) {
      const provider = await account('provider', testCase.town)
      const response = await app.inject({ method: 'POST', url: '/v1/vendors/setup', headers: { authorization: provider.authorization }, payload: testCase.payload })
      expect(response.statusCode).toBe(400)
    }
  })

  it('lets a provider read and patch only their own profile, with strict fields and a 16 KB cap', async () => {
    const first = await account()
    const second = await account()
    const payload = { kind: 'service', businessName: 'First Provider', tradeCategory: 'plumber' }
    const firstCreated = await app.inject({ method: 'POST', url: '/v1/vendors/setup', headers: { authorization: first.authorization }, payload })
    const secondCreated = await app.inject({ method: 'POST', url: '/v1/vendors/setup', headers: { authorization: second.authorization }, payload: { ...payload, businessName: 'Second Provider' } })
    const firstId = firstCreated.json().vendorId
    const secondId = secondCreated.json().vendorId

    const own = await app.inject({ method: 'GET', url: '/v1/vendors/me', headers: { authorization: first.authorization } })
    expect(own.statusCode).toBe(200)
    expect(own.json()).toMatchObject({ id: firstId, businessName: 'First Provider', status: 'pending' })

    const changed = await app.inject({ method: 'PATCH', url: '/v1/vendors/me', headers: { authorization: first.authorization }, payload: { bio: 'Local carpenter.', name: 'New Display Name' } })
    expect(changed.statusCode).toBe(200)
    expect(changed.json()).toEqual({ bio: 'Local carpenter.', name: 'New Display Name' })
    const stillOwn = await app.inject({ method: 'GET', url: '/v1/vendors/me', headers: { authorization: first.authorization } })
    expect(stillOwn.json()).toMatchObject({ id: firstId, name: 'New Display Name', businessName: 'New Display Name', bio: 'Local carpenter.' })

    const secondRead = await app.inject({ method: 'GET', url: '/v1/vendors/me', headers: { authorization: second.authorization } })
    expect(secondRead.json().id).toBe(secondId)
    const forbiddenFields = await app.inject({
      method: 'PATCH', url: '/v1/vendors/me', headers: { authorization: second.authorization },
      payload: { owner_user_id: first.user.id, status: 'active', verification_status: 'verified', bio: 'Attempted takeover.' },
    })
    expect(forbiddenFields.statusCode).toBe(400)
    const oversized = await app.inject({ method: 'PATCH', url: '/v1/vendors/me', headers: { authorization: first.authorization }, payload: { gallery: Array(9).fill('x'.repeat(2000)) } })
    expect(oversized.statusCode).toBe(400)
    const [unchanged] = await db.select().from(vendors).where(and(eq(vendors.id, firstId), eq(vendors.ownerUserId, first.user.id)))
    expect(unchanged.status).toBe('pending')
    expect(unchanged.verificationStatus).toBe('unverified')
    expect(unchanged.profileData).toMatchObject({ bio: 'Local carpenter.' })
  })

  it('returns the vendor ID from vendors on subsequent auth session reads', async () => {
    const provider = await account()
    const setup = await app.inject({ method: 'POST', url: '/v1/vendors/setup', headers: { authorization: provider.authorization }, payload: { kind: 'retail', businessName: 'Market Stall', tradeCategory: 'grocer' } })
    const session = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: provider.authorization } })
    expect(session.json().user.vendorId).toBe(setup.json().vendorId)
    await db.update(users).set({ vendorId: 'stale-client-value' }).where(eq(users.id, provider.user.id))
    const authoritative = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { authorization: provider.authorization } })
    expect(authoritative.json().user.vendorId).toBe(setup.json().vendorId)
  })
})
