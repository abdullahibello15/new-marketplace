import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import type { Redis } from 'ioredis'
import { AppError } from '../http/errors.js'
import type { Db } from '../db/client.js'
import { otpChallenges, passwordResets, sessions, userRoles, users } from '../db/schema/index.js'

const scrypt = promisify(scryptCallback)
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const token = (bytes = 32) => randomBytes(bytes).toString('base64url')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const normalizeIdentifier = (value: string) => value.trim().includes('@') ? value.trim().toLowerCase() : normalizePhone(value)
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) return `+234${digits.slice(1)}`
  if (digits.length === 13 && digits.startsWith('234')) return `+${digits}`
  if (/^\+234\d{10}$/.test(value.trim())) return value.trim()
  throw new AppError(400, 'bad_request', 'Enter a valid Nigerian phone number.', 'auth:error.invalidPhone')
}

export interface OtpDelivery {
  send(input: { channel: 'sms' | 'email'; destination: string; code: string; purpose: string }): Promise<void>
}

export interface RateLimiter {
  consume(key: string, limit: number, windowSeconds: number): Promise<boolean>
}

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: Redis) {}
  async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const count = await this.redis.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      1,
      `auth-rate:${key}`,
      windowSeconds,
    ) as number
    return count <= limit
  }
}

export class MemoryRateLimiter implements RateLimiter {
  private counts = new Map<string, { count: number; resetsAt: number }>()
  async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now()
    const bucket = this.counts.get(key)
    const current = !bucket || bucket.resetsAt <= now ? { count: 0, resetsAt: now + windowSeconds * 1000 } : bucket
    current.count += 1
    this.counts.set(key, current)
    return current.count <= limit
  }
}

interface AuthOptions {
  db: Db
  rateLimiter: RateLimiter
  delivery: OtpDelivery
  origin: string
  production: boolean
  testOtp: boolean
}

const unauthorized = () => new AppError(401, 'unauthorized')
const conflict = (message: string) => new AppError(409, 'conflict', message)
const rateLimitError = () => new AppError(429, 'rate_limited')
const scryptHash = async (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${derived.toString('hex')}`
}
const verifyPassword = async (password: string, encoded: string) => {
  const [salt, expectedHex] = encoded.split(':')
  if (!salt || !expectedHex) return false
  const expected = Buffer.from(expectedHex, 'hex')
  const actual = await scrypt(password, salt, expected.length) as Buffer
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function publicUser(row: typeof users.$inferSelect, roles: string[]) {
  return {
    id: row.id, roles, activeRole: row.activeRole, phone: row.phone ?? '', phoneVerified: !!row.phoneVerified,
    email: row.email, emailVerified: !!row.emailVerified, name: row.name, language: row.language,
    createdAt: row.createdAt.toISOString(), hasPassword: !!row.passwordHash, adminRole: row.adminRole,
    adminSuspendedAt: row.adminSuspendedAt?.toISOString() ?? null,
    adminAddedBy: row.adminAddedBy, lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    vendorId: row.vendorId, providerSignup: row.providerSignup, rider: row.rider, address: row.address, area: row.area,
  }
}

export async function registerAuthRoutes(app: import('fastify').FastifyInstance, options: AuthOptions) {
  const { db, rateLimiter, delivery, origin, production, testOtp } = options
  const cookieName = 'zamani_refresh'
  const cookieOptions = `Path=/v1/auth; HttpOnly; SameSite=${production ? 'None' : 'Lax'}${production ? '; Secure' : ''}`
  const setRefresh = (reply: import('fastify').FastifyReply, value: string, maxAge?: number) => {
    reply.header('set-cookie', `${cookieName}=${value}; ${cookieOptions}${maxAge ? `; Max-Age=${maxAge}` : ''}`)
  }
  const clearRefresh = (reply: import('fastify').FastifyReply) => reply.header('set-cookie', `${cookieName}=; ${cookieOptions}; Max-Age=0`)
  const limit = async (request: FastifyRequest, contact: string, action: string, perContact = 5) => {
    const ipOk = await rateLimiter.consume(`${action}:ip:${request.ip}`, 20, 900)
    const identityOk = await rateLimiter.consume(`${action}:contact:${hash(contact)}`, perContact, 900)
    if (!ipOk || !identityOk) throw rateLimitError()
  }
  const sendCode = async (destination: string, purpose: string) => {
    const [latest] = await db.select().from(otpChallenges).where(and(eq(otpChallenges.destination, destination), eq(otpChallenges.purpose, purpose))).orderBy(desc(otpChallenges.createdAt)).limit(1)
    if (latest && latest.resendAvailableAt > new Date()) throw new AppError(429, 'rate_limited', 'Wait before requesting another code.', 'auth:error.resendTooSoon')
    const code = testOtp ? '123456' : randomInt(0, 1_000_000).toString().padStart(6, '0')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60_000)
    const resendAvailableAt = new Date(now.getTime() + 60_000)
    await db.insert(otpChallenges).values({ destination, purpose, codeHash: hash(code), expiresAt, resendAvailableAt })
    if (!testOtp) await delivery.send({ channel: emailPattern.test(destination) ? 'email' : 'sms', destination, code, purpose })
    return { expiresAt: expiresAt.toISOString(), resendAvailableAt: resendAvailableAt.toISOString(), devCode: testOtp ? code : null }
  }
  const issueSession = async (request: FastifyRequest, reply: import('fastify').FastifyReply, userId: string, remember: boolean) => {
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!row || row.adminSuspendedAt) throw unauthorized()
    const roles = (await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId))).map((x) => x.role)
    const sessionId = crypto.randomUUID()
    const accessToken = token()
    const refreshToken = token()
    const now = new Date()
    const staff = roles.includes('admin')
    const accessExpiresAt = new Date(now.getTime() + (staff ? 10 : 15) * 60_000)
    const expiresAt = new Date(now.getTime() + (staff ? 8 : remember ? 30 * 24 : 12) * 60 * 60_000)
    await db.insert(sessions).values({
      id: sessionId, userId, refreshTokenHash: hash(refreshToken), previousRefreshTokenHashes: [],
      accessTokenHash: hash(accessToken), accessExpiresAt, expiresAt, remember: remember && !staff,
      userAgent: request.headers['user-agent'] ?? '', deviceId: String(request.headers['x-device-id'] ?? ''),
    })
    await db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, userId))
    setRefresh(reply, refreshToken, remember && !staff ? 30 * 24 * 3600 : undefined)
    return { user: publicUser(row, roles), accessToken, accessExpiresAt: accessExpiresAt.toISOString(), sessionId }
  }
  const currentSession = async (request: FastifyRequest) => {
    const value = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!value) throw unauthorized()
    const [session] = await db.select().from(sessions).where(and(eq(sessions.accessTokenHash, hash(value)), isNull(sessions.revokedAt), gt(sessions.accessExpiresAt, new Date()))).limit(1)
    if (!session) throw unauthorized()
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    if (!user || user.adminSuspendedAt) throw unauthorized()
    const roles = (await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, user.id))).map((x) => x.role)
    return { session, user, roles }
  }
  const validatePassword = (value: string) => {
    if (value.length < 8 || value.length > 128) throw new AppError(400, 'bad_request', 'Password must be 8–128 characters.', 'auth:error.weakPassword')
  }
  const createAccount = async (request: FastifyRequest, reply: import('fastify').FastifyReply, body: any, role: 'customer' | 'provider') => {
    const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
    const email = String(body.email ?? '').trim().toLowerCase()
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email)) throw new AppError(400, 'validation_failed')
    validatePassword(String(body.password ?? ''))
    let phone: string | null = null
    if (role === 'provider') phone = normalizePhone(String(body.phone ?? ''))
    if (role === 'provider' && (!body.acceptedTerms || typeof body.town !== 'string' || body.town.trim().length < 2 || typeof body.lga !== 'string')) throw new AppError(400, 'validation_failed')
    if ((await db.select({ id: users.id }).from(users).where(or(eq(users.email, email), phone ? eq(users.phone, phone) : eq(users.id, '00000000-0000-0000-0000-000000000000'))).limit(1)).length) throw conflict('An account already uses that email or phone.')
    const now = new Date()
    const created = await db.transaction(async (tx) => {
      const result = await tx.insert(users).values({
        name, email, phone, passwordHash: await scryptHash(String(body.password)), language: body.language === 'ha' ? 'ha' : 'en',
        activeRole: role, providerSignup: role === 'provider' ? { lga: body.lga, town: body.town.trim(), termsAcceptedAt: now.toISOString() } : null,
      }).returning()
      const account = result[0]
      await tx.insert(userRoles).values({ userId: account.id, role })
      return account
    })
    return issueSession(request, reply, created.id, body.remember !== false)
  }

  app.post('/v1/auth/otp/request', async (request, reply) => {
    const body = request.body as { phone?: string }
    const phone = normalizePhone(String(body?.phone ?? ''))
    await limit(request, phone, 'otp', 5)
    const result = await sendCode(phone, 'login')
    return reply.send({ phone, ...result })
  })

  app.post('/v1/auth/otp/verify', async (request, reply) => {
    const body = request.body as { phone?: string; code?: string; remember?: boolean }
    const phone = normalizePhone(String(body?.phone ?? ''))
    await limit(request, phone, 'otp-verify', 8)
    const code = String(body?.code ?? '')
    const [challenge] = await db.select().from(otpChallenges).where(and(eq(otpChallenges.destination, phone), eq(otpChallenges.purpose, 'login'), isNull(otpChallenges.verifiedAt), gt(otpChallenges.expiresAt, new Date()))).orderBy(desc(otpChallenges.createdAt)).limit(1)
    if (!challenge) throw new AppError(400, 'bad_request', 'Request a new code.', 'auth:error.noCode')
    if (challenge.attempts >= 5) throw new AppError(429, 'rate_limited', 'Too many incorrect codes.', 'auth:error.locked')
    await db.update(otpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(otpChallenges.id, challenge.id))
    if (hash(code) !== challenge.codeHash) throw new AppError(400, 'bad_request', 'The code is incorrect.', 'auth:error.wrongCode')
    await db.update(otpChallenges).set({ verifiedAt: new Date() }).where(eq(otpChallenges.id, challenge.id))
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1)
    if (!user) {
      const signupToken = token()
      await db.insert(otpChallenges).values({ destination: phone, purpose: `signup:${hash(signupToken)}`, codeHash: hash(signupToken), expiresAt: new Date(Date.now() + 15 * 60_000), resendAvailableAt: new Date(), verifiedAt: new Date() })
      return { status: 'new_user', phone, signupToken, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() }
    }
    if (!user.phoneVerified) await db.update(users).set({ phoneVerified: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id))
    const session = await issueSession(request, reply, user.id, body.remember !== false)
    return { status: 'signed_in', ...session }
  })

  app.post('/v1/auth/signup', async (request, reply) => {
    const body = request.body as Record<string, any>
    if (body.role !== 'customer' && body.role !== 'provider') throw new AppError(400, 'validation_failed')
    const session = await createAccount(request, reply, body, body.role)
    return reply.code(201).send(session)
  })

  app.post('/v1/auth/signup/phone', async (request, reply) => {
    const body = request.body as Record<string, any>
    const signupToken = String(body.signupToken ?? '')
    const [challenge] = await db.select().from(otpChallenges).where(and(eq(otpChallenges.purpose, `signup:${hash(signupToken)}`), gt(otpChallenges.expiresAt, new Date()))).limit(1)
    if (!challenge || body.role !== 'rider') throw unauthorized()
    const phone = challenge.destination
    const name = String(body.name ?? '').trim()
    if (name.length < 2 || name.length > 80) throw new AppError(400, 'validation_failed')
    const created = await db.transaction(async (tx) => {
      const result = await tx.insert(users).values({ name, phone, phoneVerified: new Date(), activeRole: 'rider', language: body.language === 'ha' ? 'ha' : 'en', rider: body.rider ?? null }).returning()
      const account = result[0]
      await tx.insert(userRoles).values({ userId: account.id, role: 'rider' })
      await tx.delete(otpChallenges).where(eq(otpChallenges.id, challenge.id))
      return account
    })
    return reply.code(201).send(await issueSession(request, reply, created.id, body.remember !== false))
  })

  app.post('/v1/auth/login', async (request, reply) => {
    const body = request.body as { identifier?: string; password?: string; remember?: boolean }
    const identifier = normalizeIdentifier(String(body?.identifier ?? ''))
    await limit(request, identifier, 'login', 8)
    const [user] = await db.select().from(users).where(identifier.includes('@') ? eq(users.email, identifier) : eq(users.phone, identifier)).limit(1)
    if (!user?.passwordHash || !await verifyPassword(String(body?.password ?? ''), user.passwordHash)) throw unauthorized()
    return issueSession(request, reply, user.id, body.remember === true)
  })

  app.post('/v1/auth/refresh', async (request, reply) => {
    const refresh = parseCookie(request.headers.cookie, cookieName)
    if (!refresh) throw unauthorized()
    const refreshHash = hash(refresh)
    const [session] = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, refreshHash)).limit(1)
    if (!session) {
      const sessionsWithHistory = await db.select().from(sessions).where(isNull(sessions.revokedAt))
      const replay = sessionsWithHistory.find((candidate) => (candidate.previousRefreshTokenHashes as string[]).includes(refreshHash))
      if (replay) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, replay.id))
      clearRefresh(reply)
      throw unauthorized()
    }
    if (session.revokedAt || session.expiresAt <= new Date()) throw unauthorized()
    const accessToken = token()
    const refreshToken = token()
    const roles = (await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, session.userId))).map((x) => x.role)
    const accessExpiresAt = new Date(Date.now() + (roles.includes('admin') ? 10 : 15) * 60_000)
    await db.update(sessions).set({
      refreshTokenHash: hash(refreshToken), previousRefreshTokenHashes: [...session.previousRefreshTokenHashes as string[], refreshHash].slice(-10),
      accessTokenHash: hash(accessToken), accessExpiresAt, lastActiveAt: new Date(),
    }).where(eq(sessions.id, session.id))
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    if (!user || user.adminSuspendedAt) throw unauthorized()
    setRefresh(reply, refreshToken, session.remember ? 30 * 24 * 3600 : undefined)
    return { user: publicUser(user, roles), accessToken, accessExpiresAt: accessExpiresAt.toISOString(), sessionId: session.id }
  })

  app.post('/v1/auth/logout', async (request, reply) => {
    const refresh = parseCookie(request.headers.cookie, cookieName)
    if (refresh) await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.refreshTokenHash, hash(refresh)), isNull(sessions.revokedAt)))
    clearRefresh(reply)
    return reply.code(204).send()
  })

  app.get('/v1/auth/session', async (request) => {
    const { session, user, roles } = await currentSession(request)
    return { user: publicUser(user, roles), sessionId: session.id, accessExpiresAt: session.accessExpiresAt.toISOString() }
  })

  app.get('/v1/auth/sessions', async (request) => {
    const { session: current, user } = await currentSession(request)
    const active = await db.select().from(sessions).where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))).orderBy(desc(sessions.lastActiveAt))
    return active.map((entry) => ({
      id: entry.id,
      userAgent: entry.userAgent || 'Unknown device',
      location: '',
      createdAt: entry.createdAt.toISOString(),
      lastActiveAt: entry.lastActiveAt.toISOString(),
      remember: entry.remember,
      current: entry.id === current.id,
    }))
  })

  app.delete('/v1/auth/sessions/:id', async (request, reply) => {
    const { session: current, user } = await currentSession(request)
    const sessionId = (request.params as { id: string }).id
    const [target] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id), isNull(sessions.revokedAt))).limit(1)
    if (!target) throw new AppError(404, 'not_found')
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, target.id))
    if (target.id === current.id) clearRefresh(reply)
    return reply.code(204).send()
  })

  app.post('/v1/auth/sessions/revoke-others', async (request) => {
    const { session: current, user } = await currentSession(request)
    const revokedAt = new Date()
    const result = await db.update(sessions).set({ revokedAt }).where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, revokedAt))).returning({ id: sessions.id })
    return { revoked: result.filter((entry) => entry.id !== current.id).length }
  })

  app.post('/v1/auth/password-reset/request', async (request) => {
    const body = request.body as { identifier?: string }
    const raw = String(body?.identifier ?? '').trim()
    const identifier = normalizeIdentifier(raw)
    await limit(request, identifier, 'password-reset', 4)
    const [user] = await db.select().from(users).where(identifier.includes('@') ? eq(users.email, identifier) : eq(users.phone, identifier)).limit(1)
    const now = Date.now()
    if (user?.passwordHash) await sendCode(identifier, `password-reset:${user.id}`)
    return {
      identifier,
      channel: emailPattern.test(identifier) ? 'email' as const : 'sms' as const,
      expiresAt: new Date(now + 5 * 60_000).toISOString(),
      resendAvailableAt: new Date(now + 60_000).toISOString(),
      devCode: null,
    }
  })

  app.post('/v1/auth/password-reset/verify', async (request) => {
    const body = request.body as { identifier?: string; code?: string }
    const identifier = normalizeIdentifier(String(body?.identifier ?? ''))
    await limit(request, identifier, 'password-reset', 8)
    const [user] = await db.select().from(users).where(identifier.includes('@') ? eq(users.email, identifier) : eq(users.phone, identifier)).limit(1)
    const purpose = user ? `password-reset:${user.id}` : ''
    const [challenge] = user ? await db.select().from(otpChallenges).where(and(eq(otpChallenges.destination, identifier), eq(otpChallenges.purpose, purpose), isNull(otpChallenges.verifiedAt), gt(otpChallenges.expiresAt, new Date()))).orderBy(desc(otpChallenges.createdAt)).limit(1) : []
    if (!challenge) throw unauthorized()
    if (challenge.attempts >= 5) throw rateLimitError()
    await db.update(otpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(otpChallenges.id, challenge.id))
    if (hash(String(body?.code ?? '')) !== challenge.codeHash) throw unauthorized()
    await db.update(otpChallenges).set({ verifiedAt: new Date() }).where(eq(otpChallenges.id, challenge.id))
    const resetToken = token()
    await db.insert(passwordResets).values({ userId: user.id, tokenHash: hash(resetToken), expiresAt: new Date(Date.now() + 10 * 60_000) })
    return { resetToken, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }
  })

  app.post('/v1/auth/password-reset/complete', async (request, reply) => {
    const body = request.body as { resetToken?: string; newPassword?: string }
    const resetToken = String(body?.resetToken ?? '')
    const newPassword = String(body?.newPassword ?? '')
    validatePassword(newPassword)
    const [reset] = await db.select().from(passwordResets).where(and(eq(passwordResets.tokenHash, hash(resetToken)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date()))).limit(1)
    if (!reset) throw unauthorized()
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash: await scryptHash(newPassword), updatedAt: now }).where(eq(users.id, reset.userId))
      await tx.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.id, reset.id))
      await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, reset.userId), isNull(sessions.revokedAt)))
    })
    clearRefresh(reply)
    return { status: 'go_to_login' as const }
  })

  void origin
}

function parseCookie(raw: string | undefined, name: string): string | null {
  const entry = raw?.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null
}
