import type { ErrorEvent } from '@sentry/node'
import { describe, expect, it } from 'vitest'
import { scrubBreadcrumb, scrubEvent } from './sentry.js'

describe('Sentry scrubbing', () => {
  it('drops request bodies, headers, cookies and query strings', () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: 'https://api.example.com/v1/auth/otp/verify?phone=%2B2348031234567',
        method: 'POST',
        data: { phone: '+2348031234567', code: '482913' },
        headers: { authorization: 'Bearer secret', cookie: 'refresh=secret' },
        cookies: { refresh: 'secret' },
        query_string: 'phone=%2B2348031234567',
      },
      user: { id: 'u_1', email: 'amina@example.com', ip_address: '10.0.0.1' },
    } as ErrorEvent)

    expect(event.request).toEqual({ url: 'https://api.example.com/v1/auth/otp/verify', method: 'POST' })
    expect(event.user).toEqual({ id: 'u_1' })
    expect(JSON.stringify(event)).not.toMatch(/secret|482913|2348031234567|amina/)
  })

  it('keeps only method, status and path on breadcrumbs', () => {
    const crumb = scrubBreadcrumb({
      category: 'http',
      data: { method: 'GET', status_code: 200, url: 'https://x.test/a?token=secret', 'http.query': 'token=secret' },
    })
    expect(crumb.data).toEqual({ method: 'GET', status_code: 200, url: 'https://x.test/a' })
  })
})
