import { AUTH_ROUTES } from '../constants';

/** Going back to these would loop through sign-in again. */
const NO_RETURN = [AUTH_ROUTES.login, AUTH_ROUTES.signup, AUTH_ROUTES.staffLogin];

/**
 * Where to send someone after signing in or up: `from` when it's a path inside the app, otherwise
 * undefined (the caller uses the role's home). Never another site ("//evil.com", "https://…", "/\evil.com"),
 * and never a sign-in page.
 */
export function safeReturnPath(from: unknown): string | undefined {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return undefined;
  // Backslashes and control characters can be read as "//" or hide a host in some browsers.
  if ([...from].some((c) => c === '\\' || c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return undefined;
  const path = from.split(/[?#]/)[0];
  if (NO_RETURN.some((p) => path === p || path.startsWith(`${p}/`))) return undefined;
  return from;
}
