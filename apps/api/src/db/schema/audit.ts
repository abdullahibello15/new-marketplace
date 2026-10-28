import { sql } from 'drizzle-orm'
import { bigint, index, inet, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Append-only record of who did what (BACKEND_PLAN §3). A trigger, added in the migration, rejects
// UPDATE, DELETE and TRUNCATE, so rows can only ever be inserted.
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    // No foreign key: the entry must outlive the user, and `users` arrives in Phase 1.
    actorUserId: uuid('actor_user_id'),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: text('subject_id').notNull(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [
    index('audit_log_subject_idx').on(t.subjectType, t.subjectId, t.occurredAt),
    index('audit_log_actor_idx').on(t.actorUserId, t.occurredAt),
  ],
)
