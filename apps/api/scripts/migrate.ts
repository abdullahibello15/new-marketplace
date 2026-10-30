import { loadEnv } from '../src/config/env.js'
import { createDb } from '../src/db/client.js'
import { runMigrations } from '../src/db/migrate.js'

const env = loadEnv()
const { db, sql } = createDb(env.DATABASE_URL)
try {
  await runMigrations(db)
} finally {
  await sql.end({ timeout: 5 })
}
