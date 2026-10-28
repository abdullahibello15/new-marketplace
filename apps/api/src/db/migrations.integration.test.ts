import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type Db } from './client.js'
import { runMigrations } from './migrate.js'
import { auditLog } from './schema/index.js'

// Same image as docker-compose.yml.
const IMAGE = 'postgis/postgis:16-3.5'

let container: StartedPostgreSqlContainer
let db: Db
let client: ReturnType<typeof createDb>['sql']

beforeAll(async () => {
  container = await new PostgreSqlContainer(IMAGE).start()
  ;({ db, sql: client } = createDb(container.getConnectionUri()))
})

afterAll(async () => {
  await client?.end()
  await container?.stop()
})

// Postgres wraps the trigger's exception; drizzle wraps that again. Find the Postgres one.
function pgError(error: unknown): { code?: string; message: string } {
  let current = error as { cause?: unknown; code?: string; message: string }
  while (current.cause && !current.code) current = current.cause as typeof current
  return current
}

async function expectRejected(run: () => Promise<unknown>, op: string) {
  const error = await run().then(
    () => null,
    (e: unknown) => e,
  )
  expect(error, `${op} should have been rejected`).not.toBeNull()
  const pg = pgError(error)
  expect(pg.code).toBe('23001') // restrict_violation
  expect(pg.message).toBe(`audit_log is append-only: ${op} is not allowed`)
}

describe('migrations', () => {
  it('apply to an empty database', async () => {
    // The postgis image enables PostGIS on startup, which adds its own spatial_ref_sys table; count only
    // tables no extension owns, and check that no migration has ever run.
    const before = await db.execute(sql`
      select
        (select count(*)::int from pg_tables t
          where t.schemaname = 'public'
            and not exists (select 1 from pg_depend d
              where d.objid = format('%I.%I', t.schemaname, t.tablename)::regclass and d.deptype = 'e')) as tables,
        (select count(*)::int from pg_namespace where nspname = 'drizzle') as migration_schemas`)
    expect(before[0]).toEqual({ tables: 0, migration_schemas: 0 })

    await runMigrations(db)

    const extensions = await db.execute<{ extname: string }>(
      sql`select extname from pg_extension where extname in ('postgis', 'pg_trgm') order by extname`,
    )
    expect(extensions.map((r) => r.extname)).toEqual(['pg_trgm', 'postgis'])

    const tables = await db.execute<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public' and tablename = 'audit_log'`,
    )
    expect(tables).toHaveLength(1)
  })

  it('are idempotent: a second run changes nothing', async () => {
    await expect(runMigrations(db)).resolves.not.toThrow()
  })
})

describe('audit_log', () => {
  it('accepts inserts', async () => {
    const [row] = await db
      .insert(auditLog)
      .values({ action: 'vendor.verify', subjectType: 'vendor', subjectId: 'v_1', metadata: { tier: 2 } })
      .returning()
    expect(row.id).toBeTypeOf('bigint')
    expect(row.occurredAt).toBeInstanceOf(Date)
  })

  it('rejects UPDATE', async () => {
    await expectRejected(() => db.update(auditLog).set({ action: 'tampered' }), 'UPDATE')
  })

  it('rejects DELETE', async () => {
    await expectRejected(() => db.delete(auditLog), 'DELETE')
  })

  it('rejects TRUNCATE', async () => {
    await expectRejected(() => db.execute(sql`truncate audit_log`), 'TRUNCATE')
  })

  it('still holds the original row after the rejected changes', async () => {
    const rows = await db.select().from(auditLog)
    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('vendor.verify')
  })
})
