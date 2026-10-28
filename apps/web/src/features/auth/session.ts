import i18n from '../../i18n';
import { ApiError, requestAccessToken } from '../../services/mockApi';
import { ROLE } from './constants';
import { AuthError } from './errors';
import type { ClientEndReason, User } from './types';

/*
 * The browser's view of who's signed in: the ONE place the app reads the current user from. React reads it
 * through AuthProvider/useAuth; services (which can't use hooks) call currentUser(), currentCustomerId()
 * and currentVendorId() below. The design (tokens, refresh, idle, tabs) is described in
 * services/sessionService.ts, which keeps this up to date.
 *
 * Storage:
 *  - the access token lives in memory only (gone on reload; a script can't read it from storage);
 *  - a non-sensitive "has session" flag and the user id are persisted, so a reload knows to ask the
 *    backend to restore the session (refreshSession, which uses the refresh cookie).
 * ⚠️ In production the refresh token is an httpOnly, Secure, SameSite cookie set by the backend; it is
 * never visible to this code.
 */

export type AuthStatus = 'loading' | 'signed_in' | 'signed_out';

export interface AuthSnapshot {
  status: AuthStatus;
  user: User | null;
  /** This browser's session (not secret): marks "This device" on the sessions page. */
  sessionId: string | null;
  accessExpiresAt: string | null;
  /** Bumped on every sign-out, so app state and cached private data are rebuilt from scratch. */
  epoch: number;
  /** The last time the session ended, and why (the login screen explains it). */
  ended: {id: number;reason: ClientEndReason;} | null;
}

export interface SessionTokens {
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
}

const FLAG_KEY = 'gwani:session-flag:v2';

let snapshot: AuthSnapshot = { status: 'loading', user: null, sessionId: null, accessExpiresAt: null, epoch: 0, ended: null };
let accessToken: string | null = null;
let endCount = 0;
const listeners = new Set<() => void>();

function emit(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export const getAuthSnapshot = (): AuthSnapshot => snapshot;

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The persisted flag: only that a session exists, and whose. No tokens. */
export function readSessionFlag(): {hasSession: true;userId: string;} | null {
  try {
    const raw = window.localStorage.getItem(FLAG_KEY);
    const v = raw ? JSON.parse(raw) as {hasSession?: boolean;userId?: string;} : null;
    return v?.hasSession && typeof v.userId === 'string' ? { hasSession: true, userId: v.userId } : null;
  } catch {
    return null;
  }
}

function writeSessionFlag(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(FLAG_KEY, JSON.stringify({ hasSession: true, userId }));else
    window.localStorage.removeItem(FLAG_KEY);
    // The flag from before this design also held the role; it's no longer used.
    window.localStorage.removeItem('gwani:session-flag:v1');
  } catch {
    // Storage blocked: the session lasts until the tab closes.
  }
}

/** After sign-in or a refresh: the new access token (memory) and the user. */
export function adoptSession(user: User, tokens: SessionTokens) {
  accessToken = tokens.accessToken;
  writeSessionFlag(user.id);
  emit({ ...snapshot, status: 'signed_in', user, sessionId: tokens.sessionId, accessExpiresAt: tokens.accessExpiresAt });
}

/** After an account change (name, role…): same tokens, new copy of the user. */
export function updateSessionUser(user: User) {
  if (snapshot.status !== 'signed_in') return;
  emit({ ...snapshot, user });
}

/**
 * Forgets the session in this tab: memory, the flag, and (through the epoch) app state. `reason` is shown
 * on the login screen; null for a quiet reset (e.g. nothing to restore at start-up).
 */
export function clearSession(reason: ClientEndReason | null) {
  const hadSession = snapshot.status === 'signed_in';
  accessToken = null;
  writeSessionFlag(null);
  emit({
    status: 'signed_out',
    user: null,
    sessionId: null,
    accessExpiresAt: null,
    epoch: hadSession ? snapshot.epoch + 1 : snapshot.epoch,
    ended: reason ? { id: ++endCount, reason } : snapshot.ended
  });
}

/** In-memory access token (attached to every request by the request helper). */
export const currentAccessToken = () => accessToken;

/* ---------- For services (the mock server side) ---------- */

type Authenticator = (accessToken: string) => User;
let authenticate: Authenticator | null = null;

/** sessionService registers how the "server" turns a request's access token into a user (or a 401). */
export function setRequestAuthenticator(fn: Authenticator) {
  authenticate = fn;
}

/**
 * The signed-in user. Inside a request it's whoever the request's access token belongs to (an invalid
 * or expired token is a 401, which the request helper answers with a refresh); outside a request (UI
 * code) it's the browser's session.
 */
export function currentUser(): User | null {
  const token = requestAccessToken();
  if (token === undefined) return snapshot.user;
  if (!token || !authenticate) return null;
  return authenticate(token);
}

export function requireUser(): User {
  const user = currentUser();
  if (!user) throw new ApiError(i18n.t('auth:error.notSignedIn'), 401);
  return user;
}

/** The signed-in customer's id (their user id). Every customer-side service filters by this. */
export function currentCustomerId(): string {
  const user = requireUser();
  if (!user.roles.includes(ROLE.Customer)) throw new ApiError(i18n.t('auth:error.needCustomer'), 403);
  return user.id;
}

/** The signed-in provider's vendor profile id. Every vendor-portal service filters by this. */
export function currentVendorId(): string {
  const user = requireUser();
  if (!user.roles.includes(ROLE.Provider) || !user.vendorId) throw new ApiError(i18n.t('auth:error.needProvider'), 403);
  return user.vendorId;
}

/**
 * Booking, ordering and paying need a verified way to reach the person: a verified email (customers sign
 * up with one), or a verified phone for phone-based accounts. Browsing never does.
 */
export function requireVerifiedContact(): User {
  const user = requireUser();
  if (!user.emailVerified && !user.phoneVerified) throw new AuthError('contact_unverified', i18n.t('auth:error.verifyToBook'), 403);
  return user;
}
