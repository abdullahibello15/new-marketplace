import { createHash } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { RateLimiter } from '../auth/service.js'
import { publicUser } from '../auth/service.js'
import type { Db } from '../db/client.js'
import { sessions, userRoles, users, vendors } from '../db/schema/index.js'
import { AppError } from '../http/errors.js'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const tradeCategories = ['plumber', 'electrician', 'tailor', 'dispatch_rider', 'grocer', 'carpenter', 'mechanic', 'painter', 'hair_stylist', 'other'] as const
export const vendorSetupSchema = z.object({
  kind: z.enum(['service', 'retail']),
  businessName: z.string().trim().min(2).max(80),
  tradeCategory: z.enum(tradeCategories),
}).strict().superRefine((value, context) => {
  const retail = value.tradeCategory === 'grocer'
  if ((retail ? 'retail' : 'service') !== value.kind) {
    context.addIssue({ code: 'custom', path: ['tradeCategory'], message: 'The trade category does not match the business type.' })
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.businessName)) {
    context.addIssue({ code: 'custom', path: ['businessName'], message: 'Enter a business name, not an email address.' })
  }
})

type VendorTransaction = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Insert a provider's vendor row. Call inside the account/setup transaction so a failure rolls back together. */
export async function createVendorForProvider(
  tx: VendorTransaction,
  input: { userId: string; town: string; lga: string; business: z.infer<typeof vendorSetupSchema> },
) {
  const town = input.town.trim()
  if (town.length < 2 || town.length > 80 || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(town)) {
    throw new AppError(400, 'bad_request', 'Enter a town or landmark, not an email address.', 'auth:error.townEmail')
  }
  if (input.lga.trim().length < 2 || input.lga.trim().length > 100) throw new AppError(400, 'validation_failed')
  const business = vendorSetupSchema.parse(input.business)
  const [vendor] = await tx.insert(vendors).values({
    ownerUserId: input.userId,
    businessName: business.businessName,
    kind: business.kind,
    tradeCategory: business.tradeCategory,
    town,
    lga: input.lga.trim(),
    status: 'pending',
    verificationStatus: 'unverified',
  }).returning()
  return vendor
}

const profilePatchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  photo: z.string().max(2048),
  bio: z.string().max(300),
  tradeCategory: z.enum(tradeCategories),
  tradeCategoryOther: z.string().max(40),
  gallery: z.array(z.string().max(2048)).max(10),
  services: z.array(z.record(z.string(), z.unknown())).max(30),
  workingHours: z.record(z.string(), z.unknown()),
  serviceAreas: z.array(z.string().max(100)).max(50),
  fulfilment: z.record(z.string(), z.unknown()),
  acceptsCash: z.boolean(),
}).partial().strict()

interface VendorRouteOptions {
  db: Db
  rateLimiter: RateLimiter
}

async function authenticateProvider(request: FastifyRequest, db: Db) {
  const accessToken = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!accessToken) throw new AppError(401, 'unauthorized')
  const [session] = await db.select().from(sessions).where(and(
    eq(sessions.accessTokenHash, hash(accessToken)), isNull(sessions.revokedAt), gt(sessions.accessExpiresAt, new Date()),
  )).limit(1)
  if (!session) throw new AppError(401, 'unauthorized')
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  if (!user || user.adminSuspendedAt) throw new AppError(401, 'unauthorized')
  const roles = (await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, user.id))).map(({ role }) => role)
  if (!roles.includes('provider')) throw new AppError(403, 'forbidden')
  return { user, roles }
}

async function vendorForUser(db: Db, userId: string) {
  const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerUserId, userId)).limit(1)
  return vendor
}

export function registerVendorRoutes(app: FastifyInstance, { db, rateLimiter }: VendorRouteOptions) {
  app.post('/v1/vendors/setup', async (request, reply) => {
    const { user, roles } = await authenticateProvider(request, db)
    const body = vendorSetupSchema.parse(request.body)
    const ipAllowed = await rateLimiter.consume(`vendor-setup:ip:${request.ip}`, 10, 900)
    const userAllowed = await rateLimiter.consume(`vendor-setup:user:${user.id}`, 3, 3600)
    if (!ipAllowed || !userAllowed) throw new AppError(429, 'rate_limited')

    const existing = await vendorForUser(db, user.id)
    if (existing) throw new AppError(409, 'conflict', 'This account already has a vendor profile.')
    const signup = user.providerSignup as { town?: unknown; lga?: unknown } | null
    const town = typeof signup?.town === 'string' ? signup.town.trim() : ''
    const lga = typeof signup?.lga === 'string' ? signup.lga.trim() : ''
    const created = await db.transaction(async (tx) => {
      const vendor = await createVendorForProvider(tx, { userId: user.id, town, lga, business: body })
      const [updatedUser] = await tx.update(users).set({ vendorId: vendor.id, providerSignup: null, updatedAt: new Date() }).where(eq(users.id, user.id)).returning()
      return { vendor, updatedUser }
    }).catch((error: unknown) => {
      let cause = error as { code?: string; cause?: unknown }
      while (cause && !cause.code && cause.cause) cause = cause.cause as typeof cause
      if (cause?.code === '23505') throw new AppError(409, 'conflict', 'This account already has a vendor profile.')
      throw error
    })
    return reply.code(201).send(await publicUser(db, created.updatedUser, roles))
  })

  app.get('/v1/vendors/me', async (request) => {
    const { user } = await authenticateProvider(request, db)
    const vendor = await vendorForUser(db, user.id)
    if (!vendor) throw new AppError(404, 'not_found')
    return {
      id: vendor.id,
      businessName: vendor.businessName,
      name: vendor.businessName,
      kind: vendor.kind,
      tradeCategory: vendor.tradeCategory,
      town: vendor.town,
      lga: vendor.lga,
      status: vendor.status,
      verificationStatus: vendor.verificationStatus,
      ...vendor.profileData,
    }
  })

  app.patch('/v1/vendors/me', async (request) => {
    const { user } = await authenticateProvider(request, db)
    const vendor = await vendorForUser(db, user.id)
    if (!vendor) throw new AppError(404, 'not_found')
    const patch = profilePatchSchema.parse(request.body)
    const retail = patch.tradeCategory === 'grocer'
    if (patch.tradeCategory && patch.tradeCategory !== 'other' && (retail !== (vendor.kind === 'retail'))) {
      throw new AppError(400, 'bad_request', 'The trade category does not match the business type.')
    }
    const { name, tradeCategory, ...profilePatch } = patch
    const profileData = { ...vendor.profileData, ...profilePatch }
    if (Buffer.byteLength(JSON.stringify(profileData), 'utf8') > 16 * 1024) {
      throw new AppError(400, 'bad_request', 'Vendor profile data must be 16 KB or smaller.')
    }
    await db.update(vendors).set({
      ...(name !== undefined ? { businessName: name } : {}),
      ...(tradeCategory !== undefined ? { tradeCategory } : {}),
      profileData,
      updatedAt: new Date(),
    }).where(and(
      eq(vendors.id, vendor.id), eq(vendors.ownerUserId, user.id),
    ))
    return patch
  })
}
