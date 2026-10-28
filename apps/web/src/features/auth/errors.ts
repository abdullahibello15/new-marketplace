import i18n from '../../i18n';
import { ApiError } from '../../services/mockApi';
import type { AuthErrorCode } from './types';

/** An auth error with a code the screens can react to (wrong code, expired, locked…). */
export class AuthError extends ApiError {
  readonly code: AuthErrorCode;
  /** Seconds until they can try again (rate limits and lockouts). */
  readonly retryAfterSeconds: number | null;
  readonly attemptsLeft: number | null;
  /** invite_exists: where to claim the profile their association created. */
  readonly claimPath: string | null;

  constructor(code: AuthErrorCode, message: string, status: number, extra: {retryAfterSeconds?: number;attemptsLeft?: number;claimPath?: string;} = {}) {
    super(message, status);
    this.name = 'AuthError';
    this.code = code;
    this.retryAfterSeconds = extra.retryAfterSeconds ?? null;
    this.attemptsLeft = extra.attemptsLeft ?? null;
    this.claimPath = extra.claimPath ?? null;
  }
}

export const isAuthError = (e: unknown): e is AuthError => e instanceof AuthError;

/** Anything that isn't an answer from the server (dropped connection, timeout) is shown as a network problem. */
export const isNetworkError = (e: unknown) => !(e instanceof ApiError);

export const errorMessage = (e: unknown, fallback?: string) =>
isNetworkError(e) ? i18n.t('common:error.network') : e instanceof Error ? e.message : fallback ?? i18n.t('common:error.generic');
