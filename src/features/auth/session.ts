import i18n from '../../i18n';
import { ApiError } from '../../services/mockApi';
import { ROLE, type Role } from './constants';
import type { User } from './types';

/*
 * The browser's view of who's signed in: the ONE place the app reads the current user from. React reads it
 * through AuthProvider/useAuth; services (which can't use hooks) call currentUser(), currentCustomerId()
 * and currentVendorId() below.
 *
 * Storage, the usual front-end approach for this mock:
 *  - the access token lives in memory only (gone on reload, so it can't be read from storage by a script);
 *  - a small "signed in" flag (user id and last role, NOT the token) is persisted, so a reload can ask the
 *    backend to restore the session (refreshSession).
 *
 * ⚠️ Real sessions should use an httpOnly, Secure, SameSite cookie set by the backend (refresh token),
 * with short-lived access tokens; then nothing sensitive is ever in localStorage, and refreshSession
 * just calls the backend, which reads the cookie.
 */

export type AuthStatus = 'loading' | 'signed_in' | 'signed_out';

export interface AuthSnapshot {
  status: AuthStatus;
  user: User | null;
}

const FLAG_KEY = 'gwani:session-flag:v1';

let snapshot: AuthSnapshot = { status: 'loading', user: null };
let accessToken: string | null = null;
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

/** The persisted "signed in" flag: who, and the role they last used. */
export function readSessionFlag(): {userId: string;activeRole: Role;} | null {
  try {
    const raw = window.localStorage.getItem(FLAG_KEY);
    return raw ? JSON.parse(raw) as {userId: string;activeRole: Role;} : null;
  } catch {
    return null;
  }
}

function writeSessionFlag(user: User | null) {
  try {
    if (user) window.localStorage.setItem(FLAG_KEY, JSON.stringify({ userId: user.id, activeRole: user.activeRole }));else
    window.localStorage.removeItem(FLAG_KEY);
  } catch {
    // Storage blocked: the session lasts until the tab closes.
  }
}

/** Called by the auth service after sign-in, refresh or a change to the user. */
export function setSession(user: User, token: string = accessToken ?? '') {
  accessToken = token;
  writeSessionFlag(user);
  emit({ status: 'signed_in', user });
}

export function clearSession() {
  accessToken = null;
  writeSessionFlag(null);
  emit({ status: 'signed_out', user: null });
}

/** In-memory access token (sent with every request to a real backend). */
export const currentAccessToken = () => accessToken;

/* ---------- For services ---------- */

export const currentUser = (): User | null => snapshot.user;

export function requireUser(): User {
  const user = snapshot.user;
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
