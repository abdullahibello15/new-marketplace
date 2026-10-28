// Test helpers: capture log lines and check that none of the known secret values appear in them.
import { Writable } from 'node:stream'
import { expect } from 'vitest'

// Distinct values, so a leak of any one of them is easy to spot in the output.
export const SECRETS = {
  authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.secret-token',
  cookie: 'refresh=opaque-refresh-token',
  setCookie: 'refresh=rotated-refresh-token; HttpOnly',
  password: 'hunter2-Password!',
  otp: '482913',
  code: '771204',
  phone: '+2348031234567',
  email: 'amina@example.com',
}

export function captureLogs() {
  const lines: string[] = []
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(...chunk.toString().split('\n').filter(Boolean))
      done()
    },
  })
  return { lines, destination, text: () => lines.join('\n') }
}

export function expectNoSecrets(output: string) {
  for (const [name, value] of Object.entries(SECRETS)) expect(output, `${name} leaked`).not.toContain(value)
}
