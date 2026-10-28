// Confirms the API can reach the local Postgres and Redis (npm run db:check).
import { Redis } from 'ioredis'
import { loadEnv } from '../src/config/env.js'
import { createDb } from '../src/db/client.js'

try {
  process.loadEnvFile('.env')
} catch {
  console.error('Missing apps/api/.env. Create it first (from the repo root):  cp apps/api/.env.example apps/api/.env')
  process.exit(1)
}

const env = loadEnv()
const { sql } = createDb(env.DATABASE_URL)
const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 })

try {
  const [pg] = await sql<{ version: string; postgis: string; trgm: string | null }[]>`
    select current_setting('server_version') as version,
           postgis_lib_version() as postgis,
           (select extversion from pg_extension where extname = 'pg_trgm') as trgm`
  console.log(`Postgres ${pg.version}  PostGIS ${pg.postgis}  pg_trgm ${pg.trgm ?? 'missing'}`)

  await redis.connect()
  console.log(`Redis ${await redis.ping()}`)
} catch (error) {
  console.error('Could not reach the database or Redis. Is Docker running? Try: npm run db:up')
  console.error(error)
  process.exitCode = 1
} finally {
  await sql.end()
  redis.disconnect()
}
