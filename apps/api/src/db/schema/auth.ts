import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email'),
  emailVerified: timestamp('email_verified_at', { withTimezone: true }),
  phone: text('phone'),
  phoneVerified: timestamp('phone_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  language: text('language').notNull().default('en'),
  activeRole: text('active_role').notNull(),
  adminRole: text('admin_role'),
  adminSuspendedAt: timestamp('admin_suspended_at', { withTimezone: true }),
  adminAddedBy: jsonb('admin_added_by'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  vendorId: text('vendor_id'),
  providerSignup: jsonb('provider_signup'),
  rider: jsonb('rider'),
  address: text('address'),
  area: text('area'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_unique').on(t.email),
  uniqueIndex('users_phone_unique').on(t.phone),
])

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
}, (t) => [uniqueIndex('user_roles_user_role_unique').on(t.userId, t.role)])

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  previousRefreshTokenHashes: jsonb('previous_refresh_token_hashes').notNull().default([]),
  accessTokenHash: text('access_token_hash').notNull(),
  accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  remember: boolean('remember').notNull().default(false),
  userAgent: text('user_agent').notNull().default(''),
  deviceId: text('device_id').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [index('sessions_user_id_idx').on(t.userId), uniqueIndex('sessions_refresh_token_hash_unique').on(t.refreshTokenHash)])

export const otpChallenges = pgTable('otp_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  destination: text('destination').notNull(),
  purpose: text('purpose').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  resendAvailableAt: timestamp('resend_available_at', { withTimezone: true }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('otp_challenges_destination_purpose_idx').on(t.destination, t.purpose, t.createdAt)])

export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('password_resets_token_hash_unique').on(t.tokenHash), index('password_resets_user_id_idx').on(t.userId)])
