import { defineConfig } from 'drizzle-kit'

process.loadEnvFile?.('.env')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set. Create apps/api/.env from apps/api/.env.example.')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url },
  // PostGIS owns these; keep drizzle-kit from trying to drop them.
  extensionsFilters: ['postgis'],
  strict: true,
  verbose: true,
})
