import { defineConfig } from 'drizzle-kit'

process.loadEnvFile?.('.env')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL! },
  // PostGIS owns these; keep drizzle-kit from trying to drop them.
  extensionsFilters: ['postgis'],
  strict: true,
  verbose: true,
})
