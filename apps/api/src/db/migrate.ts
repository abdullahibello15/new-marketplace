import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Db } from './client.js'

export const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url))

export function runMigrations(db: Db) {
  return migrate(db, { migrationsFolder })
}
