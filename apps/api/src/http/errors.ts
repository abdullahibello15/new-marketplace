import { errorMessageKey, type ErrorCode, type ErrorResponse } from '@zamani/contracts'
import type { FastifyError, FastifyInstance } from 'fastify'
import { z } from 'zod'
import { captureError } from '../observability/sentry.js'

// Generic English messages, safe to show anyone. The web app shows its translation of `messageKey`.
const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  bad_request: 'The request is not valid.',
  validation_failed: 'Some fields are missing or not valid.',
  unauthorized: 'Sign in to continue.',
  forbidden: "You don't have access to this.",
  not_found: 'Not found.',
  conflict: 'This changed while you were working on it. Refresh and try again.',
  rate_limited: 'Too many attempts. Please wait and try again.',
  internal: 'Something went wrong on our side. Please try again.',
  unavailable: 'The service is temporarily unavailable. Please try again shortly.',
}

const CODE_FOR_STATUS: Partial<Record<number, ErrorCode>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
}

/** An error a route throws on purpose; its message is shown to the user as is. */
export class AppError extends Error {
  readonly messageKey: string

  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string = DEFAULT_MESSAGES[code],
    messageKey: string = errorMessageKey(code),
  ) {
    super(message)
    this.name = 'AppError'
    this.messageKey = messageKey
  }
}

export function errorBody(code: ErrorCode, message = DEFAULT_MESSAGES[code], messageKey = errorMessageKey(code)): ErrorResponse {
  return { error: { code, message, messageKey } }
}

/** Status and body for any thrown value. Only AppError messages reach the client. */
export function toErrorResponse(error: unknown): { statusCode: number; body: ErrorResponse } {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, body: errorBody(error.code, error.message, error.messageKey) }
  }
  if (error instanceof z.ZodError || (error as Partial<FastifyError>)?.validation) {
    return { statusCode: 400, body: errorBody('validation_failed') }
  }
  // Fastify's own client errors (malformed JSON, body too large, wrong content type…).
  const status = (error as Partial<FastifyError>)?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return { statusCode: status, body: errorBody(CODE_FOR_STATUS[status] ?? 'bad_request') }
  }
  return { statusCode: 500, body: errorBody('internal') }
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = toErrorResponse(error)
    if (statusCode >= 500) {
      // The stack and any SQL stay in the log and Sentry; the client gets the generic body.
      request.log.error({ err: error }, 'request failed')
      captureError(error)
    } else {
      request.log.info({ code: body.error.code, statusCode }, 'request rejected')
    }
    return reply.code(statusCode).send(body)
  })

  app.setNotFoundHandler((_request, reply) => reply.code(404).send(errorBody('not_found')))
}
