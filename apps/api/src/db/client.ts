import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export function createDb(databaseUrl: string) {
  // Timestamps are timestamptz stored as UTC (BACKEND_PLAN §3); pin the session so `now()` and
  // casts never depend on the server's default.
  const sql = postgres(databaseUrl, { connection: { TimeZone: 'UTC' } })
  return { db: drizzle(sql, { schema }), sql }
}

export type Db = ReturnType<typeof createDb>['db']
