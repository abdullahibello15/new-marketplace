import { ROLE, type Role } from '../constants';
import { STRICT_IDLE_PATHS, type SessionTiming } from '../sessionConfig';

export type IdlePhase = 'active' | 'warning' | 'expired';

/**
 * Seconds of inactivity allowed for this role on this screen, or null for no idle timeout.
 * Admin and payment screens use the strict timeout whoever is signed in; staff always do.
 */
export function idleTimeoutSeconds(role: Role, pathname: string, timing: SessionTiming): number | null {
  const strict = role === ROLE.Admin || STRICT_IDLE_PATHS.some((p) => pathname.startsWith(p));
  const own = timing.idleSeconds[role];
  if (!strict) return own;
  return own === null ? timing.strictIdleSeconds : Math.min(own, timing.strictIdleSeconds);
}

/** Where the idle timer is: fine, showing the warning, or time to sign out. */
export function idlePhase(lastActivityMs: number, nowMs: number, timeoutSeconds: number | null, warningSeconds: number): IdlePhase {
  if (timeoutSeconds === null) return 'active';
  const idle = (nowMs - lastActivityMs) / 1000;
  if (idle >= timeoutSeconds) return 'expired';
  return idle >= timeoutSeconds - Math.min(warningSeconds, timeoutSeconds) ? 'warning' : 'active';
}

/** Whole seconds left before the idle sign-out. */
export const idleSecondsLeft = (lastActivityMs: number, nowMs: number, timeoutSeconds: number) =>
Math.max(0, Math.ceil(timeoutSeconds - (nowMs - lastActivityMs) / 1000));
