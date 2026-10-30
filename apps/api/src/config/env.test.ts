import { describe, expect, it } from 'vitest'
import { loadEnv } from './env.js'

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db', REDIS_URL: 'redis://localhost:6379', WEB_ORIGIN: 'http://localhost:5173' }

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(base)
    expect(env).toMatchObject({ NODE_ENV: 'development', HOST: '0.0.0.0', PORT: 3000, LOG_LEVEL: 'info' })
    expect(env.SENTRY_DSN).toBeUndefined()
  })

  it('treats empty optional values as unset', () => {
    expect(loadEnv({ ...base, SENTRY_DSN: '' }).SENTRY_DSN).toBeUndefined()
  })

  it('requires an explicit web origin', () => {
    expect(() => loadEnv({ DATABASE_URL: base.DATABASE_URL, REDIS_URL: base.REDIS_URL })).toThrow(/WEB_ORIGIN/)
    expect(() => loadEnv({ ...base, WEB_ORIGIN: 'https://web.example/path' })).toThrow(/WEB_ORIGIN/)
  })

  it('names every missing or malformed variable', () => {
    expect(() => loadEnv({ REDIS_URL: 'not a url' })).toThrow(/DATABASE_URL[\s\S]*REDIS_URL/)
  })

  it('allows OTP_TEST_MODE outside production', () => {
    expect(loadEnv({ ...base, NODE_ENV: 'development', OTP_TEST_MODE: 'true' }).OTP_TEST_MODE).toBe('true')
  })

  it('refuses to start in production when OTP_TEST_MODE is set at all', () => {
    const production = { ...base, NODE_ENV: 'production', OTP_DELIVERY_URL: 'https://delivery.example/send', OTP_DELIVERY_TOKEN: 'secret' }
    for (const value of ['true', 'false', '']) {
      expect(() => loadEnv({ ...production, OTP_TEST_MODE: value }), JSON.stringify(value)).toThrow(
        'OTP_TEST_MODE must not be set when NODE_ENV=production',
      )
    }
    expect(loadEnv(production).NODE_ENV).toBe('production')
  })

  it('requires the provider-neutral delivery adapter in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production' })).toThrow(/OTP_DELIVERY_URL and OTP_DELIVERY_TOKEN/)
    expect(loadEnv({ ...base, NODE_ENV: 'production', OTP_DELIVERY_URL: 'https://delivery.example/send', OTP_DELIVERY_TOKEN: 'secret' }).WEB_ORIGIN).toBe(base.WEB_ORIGIN)
  })
})
