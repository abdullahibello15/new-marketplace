import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { MemoryRateLimiter } from './service.js'
import { createDb, type Db } from '../db/client.js'
import { runMigrations } from '../db/migrate.js'
import { createLogger } from '../observability/logger.js'

const ORIGIN = 'https://web.example.test'
let container: StartedPostgreSqlContainer
let db: Db
let sql: ReturnType<typeof createDb>['sql']
let app: ReturnType<typeof createApp>

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:16-3.5').start()
  ;({ db, sql } = createDb(container.getConnectionUri()))
  await runMigrations(db)
  app = createApp({
    logger: createLogger({ level: 'silent' }),
    webOrigin: ORIGIN,
    healthChecks: { postgres: () => Promise.resolve(), redis: () => Promise.resolve() },
    auth: {
      db,
      rateLimiter: new MemoryRateLimiter(),
      origin: ORIGIN,
      production: true,
      testOtp: false,
      delivery: { send: async () => undefined },
    },
  })
})

afterAll(async () => {
  await app?.close()
  await sql?.end()
  await container?.stop()
})

describe('provider signup town validation', () => {
  it('rejects an email address in town with a clear validation message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        role: 'provider',
        name: 'Musa Ibrahim',
        phone: '08132223333',
        email: 'musa@example.test',
        lga: 'Bosso',
        town: 'musa@example.test',
        password: 'Strong-Pass-1',
        acceptedTerms: true,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.message).toBe('Enter a town or landmark, not an email address.')
  })
})
