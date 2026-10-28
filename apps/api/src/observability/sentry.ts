import * as Sentry from '@sentry/node'
import type { Breadcrumb, ErrorEvent } from '@sentry/node'
import type { Env } from '../config/env.js'

/** Keeps request bodies, headers, cookies and query strings (tokens, codes, phone numbers) out of Sentry. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.headers
    delete event.request.cookies
    delete event.request.query_string
    if (event.request.url) event.request.url = event.request.url.split('?')[0]
  }
  if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id }
  return event
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.data) {
    const { method, status_code, url } = breadcrumb.data as Record<string, unknown>
    breadcrumb.data = { method, status_code, url: typeof url === 'string' ? url.split('?')[0] : undefined }
  }
  return breadcrumb
}

/** Starts Sentry only when SENTRY_DSN is set. Returns whether it did. */
export function initSentry(env: Env): boolean {
  if (!env.SENTRY_DSN) return false
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    // Collect nothing that can carry user data; scrubEvent below is the second line of defence.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      // Local variables in stack frames would include passwords and codes being handled.
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
  return true
}

export function captureError(error: unknown): void {
  if (Sentry.isInitialized()) Sentry.captureException(error)
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (Sentry.isInitialized()) await Sentry.close(timeoutMs)
}
