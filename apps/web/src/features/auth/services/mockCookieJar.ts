/*
 * MOCK of the browser's cookie store, for the refresh-token cookie ONLY. Only the mock backend
 * (sessionBackend.ts) reads or writes it, the way a server reads the Cookie header and sends Set-Cookie.
 * App code never touches it.
 *
 * ⚠️ PRODUCTION: the refresh token must be an httpOnly, Secure, SameSite=Strict (or Lax) cookie set by the
 * backend, scoped to the refresh endpoint. Then JavaScript can't read it at all, and nothing sensitive is in
 * localStorage. This file exists only because a front-end mock has no real server to set that cookie:
 *  - "remember me": a persistent cookie, mocked with localStorage (survives closing the browser);
 *  - not remembered: a session cookie, mocked with sessionStorage (gone when the browser session ends;
 *    unlike a real session cookie, it doesn't follow you into brand-new tabs).
 */

const COOKIE = 'gwani:mock-cookie:refresh';

export interface RefreshCookie {
  value: string;
  /** Persistent ("remember me") or a browser-session cookie. */
  persistent: boolean;
}

function storages(): Storage[] {
  try {
    return [window.localStorage, window.sessionStorage];
  } catch {
    return [];
  }
}

/** Cookie header: the refresh token, if the browser has one. */
export function readRefreshCookie(): string | null {
  for (const s of storages()) {
    try {
      const v = s.getItem(COOKIE);
      if (v) return v;
    } catch {
      // Blocked storage: no cookie.
    }
  }
  return null;
}

/** Set-Cookie. A new value replaces the old one in whichever store it lives. */
export function writeRefreshCookie(cookie: RefreshCookie): void {
  clearRefreshCookie();
  try {
    (cookie.persistent ? window.localStorage : window.sessionStorage).setItem(COOKIE, cookie.value);
  } catch {
    // Not stored: the session lasts until reload.
  }
}

/** Set-Cookie with an expiry in the past. */
export function clearRefreshCookie(): void {
  for (const s of storages()) {
    try {
      s.removeItem(COOKIE);
    } catch {
      // Nothing to clear.
    }
  }
}

/** Whether the current cookie is persistent (rotation keeps the same kind). */
export function refreshCookieIsPersistent(): boolean {
  try {
    return Boolean(window.localStorage.getItem(COOKIE));
  } catch {
    return false;
  }
}
