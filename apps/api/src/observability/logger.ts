import { pino, type DestinationStream, type LevelWithSilent, type Logger } from 'pino'

export const REDACTED = '[REDACTED]'

// Matched on the key alone, at any depth, ignoring case, "-" and "_": `Set-Cookie`, `new_password`,
// `phoneNumber` and `otpCode` are all caught.
const SECRET_KEYS = new Set(['authorization', 'proxyauthorization', 'cookie', 'setcookie', 'code', 'otp'])
const SECRET_PARTS = ['password', 'otp', 'phone', 'email']

function isSecretKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[-_]/g, '')
  return SECRET_KEYS.has(k) || SECRET_PARTS.some((part) => k.includes(part)) || /(verification|reset|login)code$/.test(k)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * A copy of `value` with secret-looking keys replaced. Only plain objects and arrays are walked: errors,
 * requests and replies go to pino's serializers, which never include headers or bodies.
 */
export function redactSecrets(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)
    return value.map((item) => redactSecrets(item, seen))
  }
  if (!isPlainObject(value)) return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) out[key] = isSecretKey(key) ? REDACTED : redactSecrets(v, seen)
  return out
}

export interface LoggerOptions {
  level: LevelWithSilent
  /** Where lines go; stdout when omitted. Tests pass a stream to read them back. */
  destination?: DestinationStream
}

export function createLogger({ level, destination }: LoggerOptions): Logger {
  return pino(
    {
      level,
      formatters: { log: (object) => redactSecrets(object) as Record<string, unknown> },
      // Belt and braces for the serialized request/reply, in case a serializer starts including headers.
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: REDACTED,
      },
    },
    destination,
  )
}
