import { describe, expect, it } from 'vitest'
import { captureLogs, expectNoSecrets, SECRETS } from '../testing/logs.js'
import { createLogger, REDACTED } from './logger.js'

describe('logger redaction', () => {
  it('redacts every secret field, at any depth and in any casing', () => {
    const logs = captureLogs()
    const logger = createLogger({ level: 'info', destination: logs.destination })

    logger.info(
      {
        headers: { authorization: SECRETS.authorization, Cookie: SECRETS.cookie, 'set-cookie': [SECRETS.setCookie] },
        body: { password: SECRETS.password, otp: SECRETS.otp, code: SECRETS.code },
        user: { profile: { phone: SECRETS.phone, email: SECRETS.email } },
        signup: { phoneNumber: SECRETS.phone, new_password: SECRETS.password, otpCode: SECRETS.otp, Email: SECRETS.email },
        list: [{ password: SECRETS.password }],
        keep: 'visible',
      },
      'signup attempt',
    )

    const output = logs.text()
    expectNoSecrets(output)
    const line = JSON.parse(logs.lines[0])
    expect(line.headers).toEqual({ authorization: REDACTED, Cookie: REDACTED, 'set-cookie': REDACTED })
    expect(line.body).toEqual({ password: REDACTED, otp: REDACTED, code: REDACTED })
    expect(line.user.profile).toEqual({ phone: REDACTED, email: REDACTED })
    expect(line.keep).toBe('visible')
    expect(line.msg).toBe('signup attempt')
  })

  it('keeps error details, which come from the error serializer', () => {
    const logs = captureLogs()
    const logger = createLogger({ level: 'info', destination: logs.destination })
    const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    logger.error({ err }, 'redis down')
    expect(JSON.parse(logs.lines[0]).err).toMatchObject({ message: 'connect ECONNREFUSED', code: 'ECONNREFUSED' })
  })

  it('survives circular objects', () => {
    const logs = captureLogs()
    const logger = createLogger({ level: 'info', destination: logs.destination })
    const loop: Record<string, unknown> = { password: SECRETS.password }
    loop.self = loop
    logger.info({ loop })
    expectNoSecrets(logs.text())
  })
})
