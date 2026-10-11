import { MOCK_AUTH } from './config';
import { ROLE, type Role } from './constants';

/*
 * Session and token timing: THE one place. The session service, the request helper, the idle timer and
 * the active-sessions page read it through sessionTiming(). PLACEHOLDER values: confirm against the build spec.
 */

export interface SessionTiming {
  /** Short-lived access token (memory only). */
  accessSeconds: number;
  /** Refresh this long before the access token expires. */
  refreshAheadSeconds: number;
  /** "Remember me": the refresh token lives this long from sign-in. */
  rememberSeconds: number;
  /** Not remembered: the refresh cookie ends with the browser session, and the server caps it at this. */
  browserSessionMaxSeconds: number;
  /** Staff: shorter, never remembered. */
  adminAccessSeconds: number;
  adminSessionSeconds: number;
  /** Inactivity before sign-out (null: no idle timeout). */
  idleSeconds: Record<Role, number | null>;
  /** Admin and payment screens use this whoever is signed in. */
  strictIdleSeconds: number;
  /** "You'll be signed out in 60 seconds" shows this long before an idle sign-out. */
  idleWarningSeconds: number;
}

export const SESSION_TIMING: SessionTiming = {
  accessSeconds: 15 * 60,
  refreshAheadSeconds: 60,
  rememberSeconds: 30 * 24 * 3600,
  browserSessionMaxSeconds: 12 * 3600,
  adminAccessSeconds: 10 * 60,
  adminSessionSeconds: 8 * 3600,
  idleSeconds: {
    [ROLE.Customer]: null,
    [ROLE.Provider]: 8 * 3600,
    [ROLE.Rider]: null,
    [ROLE.Admin]: 30 * 60
  },
  strictIdleSeconds: 30 * 60,
  idleWarningSeconds: 60
};

export const SESSION_RULES = {
  /** Active sessions per account; signing in on one more device signs out the oldest. */
  maxSessionsPerAccount: 5,
  /** Rotated-out refresh tokens remembered per session, to spot reuse (theft). */
  rememberedOldRefreshTokens: 20,
  /** Don't write "last active" more often than this. */
  lastActiveWriteSeconds: 60
} as const;

/** Screens that use the strict idle timeout for everyone: admin and anything that moves money. */
export const STRICT_IDLE_PATHS: readonly string[] = ['/admin', '/checkout', '/pay/', '/payments', '/pro/pay/', '/pro/payments', '/pro/earnings', '/pro/subscription/billing'];

/* ---------- Dev only: short lifetimes for testing expiry and refresh by hand ---------- */

export const DEV_TIMING_PRESETS = {
  normal: {},
  fast: {
    accessSeconds: 20,
    refreshAheadSeconds: 5,
    rememberSeconds: 5 * 60,
    browserSessionMaxSeconds: 5 * 60,
    adminAccessSeconds: 20,
    adminSessionSeconds: 5 * 60,
    idleSeconds: { [ROLE.Customer]: 90, [ROLE.Provider]: 90, [ROLE.Rider]: 90, [ROLE.Admin]: 90 },
    strictIdleSeconds: 90
  }
} satisfies Record<string, Partial<SessionTiming>>;
export type DevTimingPreset = keyof typeof DEV_TIMING_PRESETS;

const DEV_KEY = 'gwani:dev-session-timing';

export function devTimingPreset(): DevTimingPreset {
  if (!MOCK_AUTH) return 'normal';
  try {
    const v = window.sessionStorage.getItem(DEV_KEY);
    return v && v in DEV_TIMING_PRESETS ? v as DevTimingPreset : 'normal';
  } catch {
    return 'normal';
  }
}

/** Dev panel only. Ignored outside mock mode, so production always uses SESSION_TIMING. */
export function setDevTimingPreset(preset: DevTimingPreset): void {
  if (!MOCK_AUTH) return;
  try {
    window.sessionStorage.setItem(DEV_KEY, preset);
  } catch {
    // Storage blocked: stays on normal timing.
  }
}

/** The timing in force (SESSION_TIMING, or a dev preset in mock mode). */
export function sessionTiming(): SessionTiming {
  return { ...SESSION_TIMING, ...DEV_TIMING_PRESETS[devTimingPreset()] };
}
