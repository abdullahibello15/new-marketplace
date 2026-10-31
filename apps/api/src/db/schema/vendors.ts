import { sql } from 'drizzle-orm'
import { check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth.js'

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  kind: text('kind').notNull(),
  tradeCategory: text('trade_category').notNull(),
  town: text('town').notNull(),
  lga: text('lga').notNull(),
  status: text('status').notNull().default('pending'),
  verificationStatus: text('verification_status').notNull().default('unverified'),
  profileData: jsonb('profile_data').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('vendors_owner_user_id_unique').on(t.ownerUserId),
  index('vendors_status_idx').on(t.status),
  check('vendors_kind_check', sql`${t.kind} in ('service', 'retail')`),
  check('vendors_business_name_length_check', sql`char_length(${t.businessName}) between 2 and 80`),
  check('vendors_town_not_email_check', sql`position('@' in ${t.town}) = 0`),
  check('vendors_status_check', sql`${t.status} in ('pending', 'active', 'suspended')`),
])
