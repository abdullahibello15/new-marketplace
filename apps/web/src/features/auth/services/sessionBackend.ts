import i18n from '../../../i18n';
import { addSeconds, differenceInSeconds } from 'date-fns';
import { ApiError } from '../../../services/mockApi';
import { SESSION_RULES, sessionTiming } from '../sessionConfig';
import { mockLocation } from '../utils/device';
import { randomToken } from '../utils/random';
import { seedSessions } from '../mock/sessions';
import type { DeviceInfo } from '../utils/device';
import type { SessionEndReason, SessionInfo } from '../types';

/*
 * MOCK session store: what a real auth server keeps. Sync and takes `now` (testable); sessionService.ts
 * wraps it. Persisted in localStorage as the mock server's "database", holding token HASHES only, never
 * the tokens themselves (as a real server would).
 *
 * A session is one sign-in on one device: one refresh-token family. Every refresh rotates the refresh
 * token; presenting an already-rotated one means it was copied, so the whole session is revoked.
 */

export interface SessionRecord {
  id: string;
  userId: string;
  deviceId: string;
  userAgent: string;
  location: string;
  remember: boolean;
  /** Staff session: shorter lifetime, never remembered. */
  staff: boolean;
  createdAt: string;
  lastActiveAt: string;
  /** The refresh token family ends here, however often it rotates. */
  expiresAt: string;
  refreshHash: string;
  /** Rotated-out refresh tokens (hashes), to detect reuse. */
  oldRefreshHashes: string[];
  /** Live access tokens (one per tab that refreshed). */
  access: {hash: string;expiresAt: string;}[];
  endedAt: string | null;
  endReason: SessionEndReason | null;
}

export interface IssuedTokens {
  sessionId: string;
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  /** Persistent cookie ("remember me") or a browser-session cookie. */
  persistent: boolean;
}

interface Db {
  sessions: SessionRecord[];
  /** Device ids each account has signed in from, for "new device" notices. */
  knownDevices: Record<string, string[]>;
}

const DB_KEY = 'gwani:mock-session-db:v1';

/** MOCK hash (FNV-1a), so the stored "database" never holds a usable token. A real server uses SHA-256. */
export function tokenHash(token: string): string {
  let h = 2166136261;
  for (const ch of `gwani-token:${token}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `h$${(h >>> 0).toString(36)}${token.length}`;
}

function load(): Db {
  const empty: Db = { sessions: seedSessions(), knownDevices: {} };
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // No storage (tests) or corrupt: start from the seed sessions.
  }
  return empty;
}

let db: Db | null = null;
const data = () => db ??= load();

function persist() {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(data()));
  } catch {
    // Not persisted.
  }
}

const isLive = (s: SessionRecord, now: Date) => !s.endedAt && new Date(s.expiresAt) > now;
const unauthorized = () => new ApiError(i18n.t('auth:error.sessionExpired'), 401);

function end(s: SessionRecord, reason: SessionEndReason, now: Date) {
  if (s.endedAt) return;
  s.endedAt = now.toISOString();
  s.endReason = reason;
  s.access = [];
}

function issueAccess(s: SessionRecord, now: Date): {accessToken: string;accessExpiresAt: string;} {
  const t = sessionTiming();
  const accessToken = `at_${randomToken()}`;
  const life = s.staff ? t.adminAccessSeconds : t.accessSeconds;
  // Never outlive the session itself.
  const accessExpiresAt = new Date(Math.min(addSeconds(now, life).getTime(), new Date(s.expiresAt).getTime()));
  s.access = [...s.access.filter((a) => new Date(a.expiresAt) > now), { hash: tokenHash(accessToken), expiresAt: accessExpiresAt.toISOString() }];
  return { accessToken, accessExpiresAt: accessExpiresAt.toISOString() };
}

/**
 * Sign-in: a NEW session id and tokens every time (session fixation protection). The session this
 * browser had before (its cookie) is ended first. Past the per-account limit, the oldest session ends.
 * Returns the tokens plus whether this device is new to the account (for the "new sign-in" notice).
 */
export function createSessionNow(
input: {userId: string;device: DeviceInfo;remember: boolean;staff: boolean;previousRefreshToken: string | null;},
now: Date)
: {tokens: IssuedTokens;newDevice: boolean;ended: SessionRecord[];} {
  const d = data();
  const ended: SessionRecord[] = [];
  if (input.previousRefreshToken) {
    const prev = d.sessions.find((s) => s.refreshHash === tokenHash(input.previousRefreshToken ?? ''));
    if (prev && isLive(prev, now)) {
      end(prev, 'replaced', now);
      ended.push(prev);
    }
  }

  const live = d.sessions.filter((s) => s.userId === input.userId && isLive(s, now)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  while (live.length >= SESSION_RULES.maxSessionsPerAccount) {
    const oldest = live.shift() as SessionRecord;
    end(oldest, 'limit', now);
    ended.push(oldest);
  }

  const t = sessionTiming();
  const remember = input.remember && !input.staff;
  const lifetime = input.staff ? t.adminSessionSeconds : remember ? t.rememberSeconds : t.browserSessionMaxSeconds;
  const refreshToken = `rt_${randomToken()}`;
  const session: SessionRecord = {
    id: `ses_${randomToken(9)}`,
    userId: input.userId,
    deviceId: input.device.id,
    userAgent: input.device.userAgent,
    location: mockLocation(input.device.id),
    remember,
    staff: input.staff,
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    expiresAt: addSeconds(now, lifetime).toISOString(),
    refreshHash: tokenHash(refreshToken),
    oldRefreshHashes: [],
    access: [],
    endedAt: null,
    endReason: null
  };
  const access = issueAccess(session, now);
  d.sessions = [session, ...d.sessions];

  const known = d.knownDevices[input.userId] ?? [];
  const hadSessionsBefore = known.length > 0 || d.sessions.some((s) => s.userId === input.userId && s.id !== session.id);
  const newDevice = hadSessionsBefore && !known.includes(input.device.id);
  if (!known.includes(input.device.id)) d.knownDevices[input.userId] = [...known, input.device.id];
  persist();
  return { tokens: { sessionId: session.id, ...access, refreshToken, persistent: remember }, newDevice, ended };
}

/**
 * Refresh: a new access token AND a new refresh token; the old refresh token stops working. An old one
 * presented again means it was stolen (or replayed): the whole session is revoked and the caller gets 401.
 */
export function refreshNow(refreshToken: string, now: Date): {session: SessionRecord;tokens: IssuedTokens;} {
  const d = data();
  const hash = tokenHash(refreshToken);
  const session = d.sessions.find((s) => s.refreshHash === hash);
  if (!session) {
    const family = d.sessions.find((s) => s.oldRefreshHashes.includes(hash));
    if (family && !family.endedAt) {
      end(family, 'reuse_detected', now);
      persist();
    }
    throw unauthorized();
  }
  if (!isLive(session, now)) throw unauthorized();
  const next = `rt_${randomToken()}`;
  session.oldRefreshHashes = [session.refreshHash, ...session.oldRefreshHashes].slice(0, SESSION_RULES.rememberedOldRefreshTokens);
  session.refreshHash = tokenHash(next);
  session.lastActiveAt = now.toISOString();
  const access = issueAccess(session, now);
  persist();
  return { session, tokens: { sessionId: session.id, ...access, refreshToken: next, persistent: session.remember } };
}

/** Every authenticated request: a live access token of a live session, or 401. Touches "last active". */
export function authenticateNow(accessToken: string, now: Date): SessionRecord {
  const hash = tokenHash(accessToken);
  const session = data().sessions.find((s) => s.access.some((a) => a.hash === hash));
  const token = session?.access.find((a) => a.hash === hash);
  if (!session || !token || !isLive(session, now) || new Date(token.expiresAt) <= now) throw unauthorized();
  if (differenceInSeconds(now, new Date(session.lastActiveAt)) >= SESSION_RULES.lastActiveWriteSeconds) {
    session.lastActiveAt = now.toISOString();
    persist();
  }
  return session;
}

/** The session a refresh cookie belongs to (sign-out reads the cookie, so it works with an expired access token). */
export const sessionForRefreshToken = (refreshToken: string, now: Date) =>
data().sessions.find((s) => s.refreshHash === tokenHash(refreshToken) && isLive(s, now)) ?? null;

export function endSessionNow(sessionId: string, reason: SessionEndReason, now: Date): SessionRecord | null {
  const s = data().sessions.find((x) => x.id === sessionId) ?? null;
  if (s) {
    end(s, reason, now);
    persist();
  }
  return s;
}

/** Ends every session of an account except `keepSessionId`. Returns how many ended. */
export function endUserSessionsNow(userId: string, reason: SessionEndReason, now: Date, keepSessionId: string | null = null): number {
  let n = 0;
  for (const s of data().sessions) {
    if (s.userId === userId && s.id !== keepSessionId && isLive(s, now)) {
      end(s, reason, now);
      n += 1;
    }
  }
  if (n) persist();
  return n;
}

export function liveSessionsOf(userId: string, now: Date): SessionRecord[] {
  return data().sessions.filter((s) => s.userId === userId && isLive(s, now)).sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
}

/** What the active-sessions page gets: no token hashes. */
export function toSessionInfo(s: SessionRecord, currentSessionId: string | null): SessionInfo {
  return {
    id: s.id,
    userAgent: s.userAgent,
    location: s.location,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    remember: s.remember,
    current: s.id === currentSessionId
  };
}

/** Dev panel: make the server reject this session's access tokens now (to try the 401 → refresh path). */
export function expireAccessNow(sessionId: string, now: Date): void {
  const s = data().sessions.find((x) => x.id === sessionId);
  if (!s) return;
  s.access = s.access.map((a) => ({ ...a, expiresAt: now.toISOString() }));
  persist();
}

/** Test helper. */
export function resetSessionBackendForTests(seed = false) {
  db = { sessions: seed ? seedSessions() : [], knownDevices: {} };
}
