import { eq } from 'drizzle-orm'
import type { FastifyRequest } from 'fastify'
import { authenticateSession } from '../auth/service.js'
import type { Db } from '../db/client.js'
import { vendors } from '../db/schema/index.js'
import { AppError } from '../http/errors.js'

/** Authenticate a provider using the assigned provider role, never the user's activeRole claim. */
export async function authenticateProvider(request: FastifyRequest, db: Db) {
  const { user, roles } = await authenticateSession(request, db)
  if (!roles.includes('provider')) throw new AppError(403, 'forbidden')
  return { user, roles }
}

export async function vendorForUser(db: Db, userId: string) {
  const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerUserId, userId)).limit(1)
  return vendor
}
