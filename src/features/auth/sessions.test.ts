import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureRequestAuth, createSingleFlight, mockResponse, requestAccessToken } from '../../services/mockApi';
import { ROLE } from './constants';
import { SESSION_RULES, SESSION_TIMING } from './sessionConfig';
import { authenticateNow, createSessionNow, endUserSessionsNow, liveSessionsOf, refreshNow, resetSessionBackendForTests } from './services/sessionBackend';
import { idlePhase, idleSecondsLeft, idleTimeoutSeconds } from './utils/idle';
import { deviceParts } from './utils/device';

const t0 = new Date(2026, 9, 10, 9, 0, 0);
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);
const status = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ApiError ? e.status : 'other';
  }
  return 'ok';
};
const device = (id: string) => ({ id, userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/125.0 Mobile Safari/537.36' });
const signIn = (userId = 'u1', at = t0, extra: Partial<Parameters<typeof createSessionNow>[0]> = {}) =>
createSessionNow({ userId, device: device(`d-${Math.random()}`), remember: true, staff: false, previousRefreshToken: null, ...extra }, at).tokens;

beforeEach(() => resetSessionBackendForTests());

describe('token expiry', () => {
  it('accepts a fresh access token and rejects it once expired', () => {
    const tokens = signIn();
    expect(authenticateNow(tokens.accessToken, later(60)).userId).toBe('u1');
    expect(status(() => authenticateNow(tokens.accessToken, later(SESSION_TIMING.accessSeconds + 1)))).toBe(401);
  });

  it('gives staff a shorter access token and never remembers them', () => {
    const tokens = signIn('admin1', t0, { staff: true, remember: true });
    expect(tokens.persistent).toBe(false);
    expect(new Date(tokens.accessExpiresAt).getTime() - t0.getTime()).toBe(SESSION_TIMING.adminAccessSeconds * 1000);
    expect(status(() => refreshNow(tokens.refreshToken, later(SESSION_TIMING.adminSessionSeconds + 1)))).toBe(401);
  });

  it('ends a remembered session after its lifetime, however often it refreshed', () => {
    let { refreshToken } = signIn();
    refreshToken = refreshNow(refreshToken, later(3600)).tokens.refreshToken;
    expect(status(() => refreshNow(refreshToken, later(SESSION_TIMING.rememberSeconds + 1)))).toBe(401);
  });

  it('rejects access tokens of a session that was signed out', () => {
    const tokens = signIn();
    endUserSessionsNow('u1', 'revoked_all', later(5));
    expect(status(() => authenticateNow(tokens.accessToken, later(6)))).toBe(401);
  });
});

describe('refresh token rotation', () => {
  it('issues a new refresh token each time and retires the old one', () => {
    const first = signIn();
    const second = refreshNow(first.refreshToken, later(10)).tokens;
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.sessionId).toBe(first.sessionId);
    expect(refreshNow(second.refreshToken, later(20)).tokens.refreshToken).toBeTruthy();
  });

  it('treats a reused old refresh token as theft and revokes the whole session', () => {
    const first = signIn();
    const second = refreshNow(first.refreshToken, later(10)).tokens;
    const third = refreshNow(second.refreshToken, later(20)).tokens;
    // The attacker replays the first token: rejected, and the family is gone.
    expect(status(() => refreshNow(first.refreshToken, later(30)))).toBe(401);
    expect(status(() => refreshNow(third.refreshToken, later(31)))).toBe(401);
    expect(status(() => authenticateNow(third.accessToken, later(32)))).toBe(401);
    expect(liveSessionsOf('u1', later(33))).toHaveLength(0);
  });
});

describe('sessions per account', () => {
  it('signs out the oldest session past the limit', () => {
    const first = signIn('u1', t0);
    for (let i = 1; i <= SESSION_RULES.maxSessionsPerAccount; i++) signIn('u1', later(i));
    const live = liveSessionsOf('u1', later(100));
    expect(live).toHaveLength(SESSION_RULES.maxSessionsPerAccount);
    expect(live.some((s) => s.id === first.sessionId)).toBe(false);
    expect(status(() => refreshNow(first.refreshToken, later(101)))).toBe(401);
  });

  it('gives a new session id on sign-in and ends the browser’s previous session (fixation)', () => {
    const before = signIn('u1');
    const after = signIn('u2', later(5), { previousRefreshToken: before.refreshToken });
    expect(after.sessionId).not.toBe(before.sessionId);
    expect(liveSessionsOf('u1', later(6))).toHaveLength(0);
  });

  it('flags a sign-in from a device the account hasn’t used', () => {
    const d = device('laptop');
    expect(createSessionNow({ userId: 'u1', device: d, remember: true, staff: false, previousRefreshToken: null }, t0).newDevice).toBe(false);
    expect(createSessionNow({ userId: 'u1', device: d, remember: true, staff: false, previousRefreshToken: null }, later(1)).newDevice).toBe(false);
    expect(createSessionNow({ userId: 'u1', device: device('phone'), remember: true, staff: false, previousRefreshToken: null }, later(2)).newDevice).toBe(true);
  });
});

describe('the request helper', () => {
  afterEach(() => configureRequestAuth(null));

  it('answers concurrent 401s with ONE refresh, then retries each request', async () => {
    let token = 'old';
    let refreshes = 0;
    const refresh = createSingleFlight(async () => {
      refreshes += 1;
      await new Promise((r) => setTimeout(r, 5));
      token = 'new';
      return true;
    });
    const onSessionExpired = vi.fn();
    configureRequestAuth({ accessToken: () => token, ensureFresh: async () => undefined, refresh, onSessionExpired });
    const call = (n: number) => mockResponse(() => {
      if (requestAccessToken() !== 'new') throw new ApiError('expired', 401);
      return n;
    }, 0);
    await expect(Promise.all([1, 2, 3, 4, 5].map(call))).resolves.toEqual([1, 2, 3, 4, 5]);
    expect(refreshes).toBe(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out when the refresh fails', async () => {
    const onSessionExpired = vi.fn();
    configureRequestAuth({ accessToken: () => 'old', ensureFresh: async () => undefined, refresh: async () => false, onSessionExpired });
    await expect(mockResponse(() => {
      throw new ApiError('expired', 401);
    }, 0)).rejects.toMatchObject({ status: 401 });
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('never refreshes for the auth endpoints themselves', async () => {
    const refresh = vi.fn(async () => true);
    configureRequestAuth({ accessToken: () => 'old', ensureFresh: async () => undefined, refresh, onSessionExpired: vi.fn() });
    await expect(mockResponse(() => {
      throw new ApiError('wrong password', 401);
    }, 0, { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('idle timeout', () => {
  it('uses the strict timeout for staff and on payment screens, and none for customers elsewhere', () => {
    expect(idleTimeoutSeconds(ROLE.Customer, '/search', SESSION_TIMING)).toBeNull();
    expect(idleTimeoutSeconds(ROLE.Customer, '/checkout', SESSION_TIMING)).toBe(SESSION_TIMING.strictIdleSeconds);
    expect(idleTimeoutSeconds(ROLE.Admin, '/admin/verification', SESSION_TIMING)).toBe(SESSION_TIMING.strictIdleSeconds);
    expect(idleTimeoutSeconds(ROLE.Provider, '/pro', SESSION_TIMING)).toBe(SESSION_TIMING.idleSeconds.provider);
  });

  it('warns in the last minute, then expires', () => {
    const timeout = 30 * 60;
    const start = t0.getTime();
    expect(idlePhase(start, start + (timeout - 61) * 1000, timeout, 60)).toBe('active');
    expect(idlePhase(start, start + (timeout - 60) * 1000, timeout, 60)).toBe('warning');
    expect(idleSecondsLeft(start, start + (timeout - 45) * 1000, timeout)).toBe(45);
    expect(idlePhase(start, start + timeout * 1000, timeout, 60)).toBe('expired');
    expect(idlePhase(start, start + 10 ** 9, null, 60)).toBe('active');
  });
});

describe('device names', () => {
  it('reads browser and system from the user agent', () => {
    expect(deviceParts('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36')).toEqual({ browser: 'Chrome', system: 'Android' });
    expect(deviceParts('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile Safari/604.1')).toEqual({ browser: 'Safari', system: 'iPhone' });
  });
});
