import i18n from '../../../i18n';
import { ApiError, configureRequestAuth, createSingleFlight, mockResponse, requestAccessToken } from '../../../services/mockApi';
import { CART_STORAGE_KEY } from '../../orders/constants';
import { STORAGE_KEYS } from '../../discovery/constants';
import { JOB_ACTOR } from '../../jobs/constants';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import { AUDIT_ACTION } from '../../admin/constants';
import { recordAudit } from '../../admin/services/auditService';
import { toAdminUser } from '../../admin/services/adminSession';
import { MOCK_AUTH } from '../config';
import { AUTH_ROUTES, ROLE } from '../constants';
import { adoptSession, clearSession, currentAccessToken, getAuthSnapshot, readSessionFlag, setRequestAuthenticator, subscribeAuth, type SessionTokens } from '../session';
import { sessionTiming } from '../sessionConfig';
import { broadcastSession, onSessionMessage } from '../sessionSync';
import { deviceDisplayName, type DeviceInfo } from '../utils/device';
import { findUser, isSuspended, toUser } from './authBackend';
import { clearRefreshCookie, readRefreshCookie, writeRefreshCookie } from './mockCookieJar';
import { restoreProviderProfile } from './roleSetup';
import {
  authenticateNow,
  createSessionNow,
  endSessionNow,
  endUserSessionsNow,
  expireAccessNow,
  liveSessionsOf,
  refreshNow,
  sessionForRefreshToken,
  toSessionInfo,
  type SessionRecord } from
'./sessionBackend';
import type { StoredUser } from '../mock/users';
import type { SessionEndReason, SessionInfo, User } from '../types';

/*
 * ============================== Session design ==============================
 * Tokens (timing: sessionConfig.ts, the one place)
 *  - ACCESS token: short-lived (15 min; staff 10 min). Opaque. Kept in MEMORY only (session.ts), attached
 *    to every request by the request helper (services/mockApi.ts), never stored, logged or put in a URL.
 *  - REFRESH token: long-lived (30 days with "remember me"; otherwise it ends with the browser session,
 *    capped at 12 h; staff 8 h and never remembered). ⚠️ PRODUCTION: an httpOnly, Secure, SameSite cookie
 *    set by the backend; JavaScript never sees it. MOCKED by mockCookieJar.ts, read only by the mock server.
 *  - The only thing the app itself persists is a "has session" flag and the user id.
 * Refresh
 *  - Shortly before the access token expires, and whenever a request gets a 401. All callers share ONE
 *    refresh (single flight, plus a Web Lock across tabs); failed requests are retried after it. If it
 *    fails, the user is signed out cleanly and sent to login ("Your session has expired"), then back.
 *  - Rotation: every refresh issues a new refresh token and retires the old one. An old one used again is
 *    treated as theft: the whole session (token family) is revoked.
 * Sessions (sessionBackend.ts)
 *  - A new session id on every sign-in (fixation protection); the browser's previous session ends.
 *  - At most SESSION_RULES.maxSessionsPerAccount per account; the oldest is signed out.
 *  - Listed on the active sessions page; any can be signed out. A sign-in from a new device sends a notice.
 *  - Password change or reset, suspension or removal end sessions on the server at once; the next request
 *    from those devices gets a 401 and the refresh fails.
 *  - Staff sign-ins and sign-outs are written to the audit log.
 * Browser
 *  - Idle timeout with a 60-second warning (components/SessionGuard.tsx), stricter for staff and payments.
 *  - Tabs stay in step (sessionSync.ts): signing out in one signs out all.
 *  - Sign-out revokes the session on the server, clears memory, the flag, the cookie and cached private
 *    data, and rebuilds app state (session.ts epoch).
 * ===========================================================================
 */

const unauthorized = () => new ApiError(i18n.t('auth:error.sessionExpired'), 401);

/* ---------- Mock server side ---------- */

/** Every authenticated request: the account behind the access token, or 401. Suspended accounts lose the session. */
function authenticateRequest(accessToken: string): {user: StoredUser;session: SessionRecord;} {
  const now = new Date();
  const session = authenticateNow(accessToken, now);
  const user = findUser(session.userId);
  if (!user || isSuspended(user)) {
    endSessionNow(session.id, 'account_suspended', now);
    throw unauthorized();
  }
  return { user, session };
}

/** Inside a request: the caller's stored account and session (401 without a valid access token). */
export function requestSession(): {user: StoredUser;session: SessionRecord;} {
  const token = requestAccessToken();
  if (!token) throw unauthorized();
  return authenticateRequest(token);
}

setRequestAuthenticator((token) => toUser(authenticateRequest(token).user));

const isStaff = (user: StoredUser) => user.roles.includes(ROLE.Admin);

function auditStaff(user: StoredUser, action: typeof AUDIT_ACTION.AdminLogin | typeof AUDIT_ACTION.AdminLogout, userAgent: string) {
  const admin = toAdminUser(user);
  if (admin) recordAudit(admin, action, { type: 'admin', id: user.id, label: user.name }, { details: deviceDisplayName(userAgent, i18n.getFixedT('en')) });
}

function notifyNewDevice(user: StoredUser, device: DeviceInfo, location: string, at: string) {
  const values = (t: Parameters<typeof deviceDisplayName>[1]) => ({ device: deviceDisplayName(device.userAgent, t), location });
  if (user.roles.includes(ROLE.Customer)) recordAccountMessage(JOB_ACTOR.Customer, user.id, 'common:message.newDevice', values, AUTH_ROUTES.sessions, at);
  if (user.roles.includes(ROLE.Provider) && user.vendorId) recordAccountMessage(JOB_ACTOR.Vendor, user.vendorId, 'common:message.newDevice', values, AUTH_ROUTES.sessions, at);
}

function createSessionServer(user: StoredUser, device: DeviceInfo, remember: boolean): SessionTokens {
  const now = new Date();
  const { tokens, newDevice } = createSessionNow(
    { userId: user.id, device, remember, staff: isStaff(user), previousRefreshToken: readRefreshCookie() },
    now
  );
  writeRefreshCookie({ value: tokens.refreshToken, persistent: tokens.persistent });
  if (isStaff(user)) auditStaff(user, AUDIT_ACTION.AdminLogin, device.userAgent);
  if (newDevice) notifyNewDevice(user, device, liveSessionsOf(user.id, now)[0]?.location ?? '', now.toISOString());
  return { accessToken: tokens.accessToken, accessExpiresAt: tokens.accessExpiresAt, sessionId: tokens.sessionId };
}

/** Ends every session of an account (suspension, removal, password reset). Server side. */
export function endAllSessionsOf(userId: string, reason: SessionEndReason, keepSessionId: string | null = null): number {
  return endUserSessionsNow(userId, reason, new Date(), keepSessionId);
}

/** A password change from a signed-in device: every OTHER session ends. Call inside the request. */
export function endOtherSessionsForPasswordChange(): number {
  const { user, session } = requestSession();
  return endUserSessionsNow(user.id, 'password_changed', new Date(), session.id);
}

/* ---------- The session API ---------- */

/**
 * POST /auth/sessions — starts a session for a user who just proved who they are (OTP, password, signup).
 * In a real backend the sign-in endpoint does this itself and sets the refresh cookie; the client only
 * receives the access token. Here the sign-in services call it right after checking the credentials.
 */
export async function createSession(user: User, device: DeviceInfo, { remember }: {remember: boolean;}): Promise<SessionTokens> {
  const tokens = await mockResponse(() => {
    const stored = findUser(user.id);
    if (!stored || isSuspended(stored)) throw unauthorized();
    return createSessionServer(stored, device, remember);
  }, 150, { auth: false });
  adoptSession(user, tokens);
  broadcastSession({ type: 'signed_in', userId: user.id });
  return tokens;
}

async function refreshOnce(): Promise<User | null> {
  try {
    const result = await mockResponse(() => {
      const cookie = readRefreshCookie();
      if (!cookie) return null;
      const now = new Date();
      let refreshed: ReturnType<typeof refreshNow>;
      try {
        refreshed = refreshNow(cookie, now);
      } catch (e) {
        clearRefreshCookie();
        throw e;
      }
      const user = findUser(refreshed.session.userId);
      if (!user || isSuspended(user)) {
        endSessionNow(refreshed.session.id, 'account_suspended', now);
        clearRefreshCookie();
        return null;
      }
      writeRefreshCookie({ value: refreshed.tokens.refreshToken, persistent: refreshed.tokens.persistent });
      restoreProviderProfile(user, now);
      const { accessToken, accessExpiresAt, sessionId } = refreshed.tokens;
      return { user: toUser(user), tokens: { accessToken, accessExpiresAt, sessionId } };
    }, 150, { auth: false });
    if (!result) return null;
    adoptSession(result.user, result.tokens);
    return result.user;
  } catch {
    return null;
  }
}

/** Tabs share the refresh cookie: a Web Lock makes sure only one tab rotates it at a time. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & {locks?: LockManager;}).locks : undefined;
  return locks ? locks.request('gwani-auth-refresh', fn) as Promise<T> : fn();
}

/**
 * POST /auth/refresh — a new access token (and a rotated refresh cookie). Resolves with the user, or null
 * when there's no valid session. Concurrent callers share one refresh.
 */
export const refreshSession: () => Promise<User | null> = createSingleFlight(() => withRefreshLock(refreshOnce));

/** POST /auth/sessions/:id/revoke — signs out one of your sessions (this one too, if you pick it). */
export async function revokeSession(sessionId: string): Promise<void> {
  await mockResponse(() => {
    const { user } = requestSession();
    if (!liveSessionsOf(user.id, new Date()).some((s) => s.id === sessionId)) throw new ApiError(i18n.t('auth:sessions.notFound'), 404);
    endSessionNow(sessionId, 'revoked', new Date());
  }, 300);
  if (sessionId === getAuthSnapshot().sessionId) endLocally('logout');
}

/** POST /auth/sessions/revoke-others — every session but this one. Resolves with how many ended. */
export function revokeAllOtherSessions(): Promise<number> {
  return mockResponse(() => {
    const { user, session } = requestSession();
    return endUserSessionsNow(user.id, 'revoked_all', new Date(), session.id);
  }, 400);
}

/** GET /auth/sessions — your signed-in devices, most recently active first. */
export function getSessions(): Promise<SessionInfo[]> {
  return mockResponse(() => {
    const { user, session } = requestSession();
    return liveSessionsOf(user.id, new Date()).map((s) => toSessionInfo(s, session.id));
  }, 300);
}

/** GET /auth/me — who the current session belongs to (null when signed out). */
export function getCurrentUser(): Promise<User | null> {
  return mockResponse(() => {
    const token = requestAccessToken();
    return token ? toUser(authenticateRequest(token).user) : null;
  }, 200);
}

/** POST /auth/logout — ends this browser's session on the server (found by its cookie) and clears the cookie. */
export function endCurrentSession(): Promise<void> {
  return mockResponse(() => {
    const cookie = readRefreshCookie();
    const now = new Date();
    const session = cookie ? sessionForRefreshToken(cookie, now) : null;
    if (session) {
      endSessionNow(session.id, 'logout', now);
      const user = findUser(session.userId);
      if (user && isStaff(user)) auditStaff(user, AUDIT_ACTION.AdminLogout, session.userAgent);
    }
    clearRefreshCookie();
  }, 200, { auth: false });
}

/* ---------- Browser side: restore, schedule, expire ---------- */

/** Private data cached in this browser: cleared on sign-out (preferences like language and place stay). */
const PRIVATE_STORAGE_KEYS = [CART_STORAGE_KEY, STORAGE_KEYS.RecentSearches];

export function clearPrivateData() {
  for (const key of PRIVATE_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing stored.
    }
  }
}

/** Signs this tab out without asking the server (it already knows, or another tab did it). */
function endLocally(reason: 'logout' | 'expired' | 'idle' | 'elsewhere', { broadcast = true } = {}) {
  const userId = getAuthSnapshot().user?.id ?? null;
  clearPrivateData();
  clearSession(reason);
  if (broadcast && reason !== 'elsewhere') broadcastSession({ type: 'signed_out', userId, reason });
}

/** The refresh failed while signed in: "Your session has expired", then login and back. */
export function expireSession() {
  if (getAuthSnapshot().status !== 'signed_in') return;
  clearRefreshCookie();
  endLocally('expired');
}

/** Sign-out after the idle timeout. */
export async function signOutIdle(): Promise<void> {
  await endCurrentSession().catch(() => undefined);
  endLocally('idle');
}

/** Sign-out: the server first, then this browser (all tabs). */
export async function signOutHere(): Promise<void> {
  await endCurrentSession().catch(() => undefined);
  endLocally('logout');
}

/** On app start: restore the session from the refresh cookie if the flag says there is one. */
export async function restoreSession(): Promise<User | null> {
  if (!readSessionFlag()) {
    clearSession(null);
    return null;
  }
  const user = await refreshSession();
  if (!user) clearSession(null);
  return user;
}

const expiresInMs = () => {
  const at = getAuthSnapshot().accessExpiresAt;
  return at ? new Date(at).getTime() - Date.now() : Infinity;
};

async function ensureFresh(): Promise<void> {
  const { status } = getAuthSnapshot();
  if (status === 'loading' && readSessionFlag()) {
    await refreshSession();
    return;
  }
  if (status === 'signed_in' && expiresInMs() <= sessionTiming().refreshAheadSeconds * 1000) {
    if (!await refreshSession()) expireSession();
  }
}

configureRequestAuth({
  accessToken: currentAccessToken,
  ensureFresh,
  refresh: async () => !!await refreshSession(),
  onSessionExpired: expireSession
});

/* Refresh ahead of expiry, rescheduled whenever a new access token arrives. */
let timer: ReturnType<typeof setTimeout> | null = null;
let scheduledFor: string | null = null;
subscribeAuth(() => {
  const { status, accessExpiresAt } = getAuthSnapshot();
  if (status !== 'signed_in' || !accessExpiresAt) {
    if (timer) clearTimeout(timer);
    timer = null;
    scheduledFor = null;
    return;
  }
  if (accessExpiresAt === scheduledFor) return;
  if (timer) clearTimeout(timer);
  scheduledFor = accessExpiresAt;
  const wait = Math.max(0, new Date(accessExpiresAt).getTime() - Date.now() - sessionTiming().refreshAheadSeconds * 1000);
  timer = setTimeout(() => {
    void refreshSession().then((user) => {
      if (!user) expireSession();
    });
  }, wait);
});

/* Other tabs: their sign-out signs this tab out; their sign-in is picked up here. */
onSessionMessage((m) => {
  const me = getAuthSnapshot();
  if (m.type === 'signed_out' && me.status === 'signed_in' && (m.userId === null || m.userId === me.user?.id)) {
    clearPrivateData();
    clearSession(m.reason === 'logout' ? 'elsewhere' : m.reason);
  } else if (m.type === 'signed_in' && (me.status !== 'signed_in' || me.user?.id !== m.userId)) {
    // Someone else signed in on this browser: drop the old account's data before picking up the new session.
    if (me.status === 'signed_in') {
      clearPrivateData();
      clearSession('elsewhere');
    }
    void refreshSession();
  }
});

/* ---------- Dev panel only (mock mode) ---------- */

/** Makes the mock server reject this session's access tokens now, to try the 401 → refresh → retry path. */
export function devRejectAccessToken(): void {
  const id = getAuthSnapshot().sessionId;
  if (MOCK_AUTH && id) expireAccessNow(id, new Date());
}
