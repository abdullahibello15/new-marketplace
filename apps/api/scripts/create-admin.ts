import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { createInterface, emitKeypressEvents } from 'node:readline'
import { and, eq } from 'drizzle-orm'
import { createDb } from '../src/db/client.js'
import { userRoles, users } from '../src/db/schema/auth.js'

const scrypt = promisify(scryptCallback)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordLength = (password: string) => [...password].length

async function promptLine(prompt: string): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => readline.question(prompt, (answer) => {
    readline.close()
    resolve(answer.trim())
  }))
}

async function promptHidden(prompt: string): Promise<string> {
  const input = process.stdin
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Set ADMIN_PASSWORD when running without an interactive terminal.')
  }

  emitKeypressEvents(input)
  const wasRaw = input.isRaw
  process.stdout.write(prompt)
  input.setRawMode(true)
  input.resume()

  return new Promise((resolve, reject) => {
    let value = ''
    const finish = (error?: Error) => {
      input.off('keypress', onKeypress)
      input.setRawMode(Boolean(wasRaw))
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }
    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean; sequence?: string }) => {
      if (key.ctrl && key.name === 'c') return finish(new Error('Admin creation cancelled.'))
      if (key.name === 'return' || key.name === 'enter') return finish()
      if (key.name === 'backspace' || key.name === 'delete') {
        value = value.slice(0, -1)
        return
      }
      if (character && !key.ctrl && character !== '\u0000') value += character
    }
    input.on('keypress', onKeypress)
  })
}

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${derived.toString('hex')}`
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required.')
  let databaseHost: string
  try {
    databaseHost = new URL(databaseUrl).hostname
  } catch {
    throw new Error('DATABASE_URL must be a valid connection URL.')
  }

  console.log(`Database host: ${databaseHost}`)

  const email = (process.env.ADMIN_EMAIL || await promptLine('Admin email: ')).trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || await promptHidden('Admin password (input hidden): ')
  if (!emailPattern.test(email)) throw new Error('Enter a valid ADMIN_EMAIL.')
  const length = passwordLength(password)
  if (length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  if (length > 128) throw new Error('ADMIN_PASSWORD must be no more than 128 characters.')

  if (process.env.NODE_ENV === 'production') {
    if (!process.stdin.isTTY) throw new Error('Production confirmation requires an interactive terminal.')
    const confirmation = await promptLine('Production database. Type CREATE ADMIN to continue: ')
    if (confirmation !== 'CREATE ADMIN') throw new Error('Confirmation did not match; no changes were made.')
  }

  const { db, sql } = createDb(databaseUrl)
  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(users).where(eq(users.email, email)).for('update').limit(1)
      if (existing) {
        const [adminRole] = await tx.select({ role: userRoles.role }).from(userRoles).where(and(
          eq(userRoles.userId, existing.id), eq(userRoles.role, 'admin'),
        )).limit(1)
        await tx.insert(userRoles).values({ userId: existing.id, role: 'admin' }).onConflictDoNothing()
        await tx.update(users).set({ activeRole: 'admin', adminRole: 'super_admin', updatedAt: new Date() }).where(eq(users.id, existing.id))
        return adminRole ? 'already-admin' : 'promoted'
      }

      const now = new Date()
      const [created] = await tx.insert(users).values({
        name: email.slice(0, email.indexOf('@')),
        email,
        passwordHash: await passwordHash(password),
        emailVerified: now,
        activeRole: 'admin',
        adminRole: 'super_admin',
      }).onConflictDoNothing({ target: users.email }).returning({ id: users.id })

      if (created) {
        await tx.insert(userRoles).values({ userId: created.id, role: 'admin' }).onConflictDoNothing()
        return 'created'
      }

      const [racedUser] = await tx.select().from(users).where(eq(users.email, email)).for('update').limit(1)
      if (!racedUser) throw new Error('Could not create or find the admin account.')
      await tx.insert(userRoles).values({ userId: racedUser.id, role: 'admin' }).onConflictDoNothing()
      await tx.update(users).set({ activeRole: 'admin', adminRole: 'super_admin', updatedAt: new Date() }).where(eq(users.id, racedUser.id))
      return 'promoted'
    })

    if (result === 'created') console.log(`Admin account created for ${email}.`)
    else if (result === 'promoted') console.log(`Admin role added to existing account ${email}; its password was not changed.`)
    else console.log(`Account ${email} is already an admin; no changes were needed.`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Admin creation failed.'
  console.error(message)
  process.exitCode = 1
})
