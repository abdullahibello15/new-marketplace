import i18n from '../i18n';
/**
 * The seam between mock data and a real backend, and THE request helper. Every service resolves through
 * `mockResponse`, so swapping a service body for a `fetch` call later doesn't change any caller: they
 * already await a Promise and handle errors.
 *
 * Auth lives here, once, for every feature (features/auth registers the hooks): the in-memory access
 * token is attached to each request (like an Authorization header); it's refreshed just before it
 * expires; a 401 triggers ONE shared refresh, then the request is retried; if refreshing fails the user
 * is signed out ("Your session has expired"). Tokens never go into URLs, logs or error messages.
 */
const MOCK_LATENCY_MS = 450;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** What the auth feature plugs in. Kept as hooks so this file doesn't depend on any feature. */
export interface RequestAuthHooks {
  /** The current access token (memory only), or null when signed out. */
  accessToken: () => string | null;
  /** Before sending: refresh if the token is about to expire (shares any refresh in flight). */
  ensureFresh: () => Promise<void>;
  /** One shared refresh for all callers; true when a new access token is ready. */
  refresh: () => Promise<boolean>;
  /** Refreshing failed: sign out cleanly and send them to login. */
  onSessionExpired: () => void;
}

let authHooks: RequestAuthHooks | null = null;

export function configureRequestAuth(hooks: RequestAuthHooks | null): void {
  authHooks = hooks;
}

/** undefined: not inside a request. null: a request with no token. */
let requestToken: string | null | undefined;

/**
 * Mock server side: the token the request being handled carries (its "Authorization header"), or null
 * if none. Returns undefined outside a request (UI code reading the browser's session instead).
 */
export const requestAccessToken = (): string | null | undefined => requestToken;

/** Runs `fn` once at a time: callers arriving while it's running share the same result. */
export function createSingleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => inFlight ??= fn().finally(() => {
    inFlight = null;
  });
}

function send<T>(produce: () => T, latencyMs: number, token: string | null): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      requestToken = token;
      try {
        resolve(structuredClone(produce()));
      } catch (error) {
        reject(error instanceof Error ? error : new ApiError(i18n.t('common:error.generic')));
      } finally {
        requestToken = undefined;
      }
    }, latencyMs);
  });
}

const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

/**
 * Resolves with a deep copy of what `produce` returns after a short delay, like a network round trip.
 * The copy stops callers from mutating the in-memory "database". Throwing inside `produce` rejects,
 * like an error response. `auth: false` is for the auth endpoints themselves (sign-in, refresh, sign-out),
 * which must never trigger a refresh.
 */
export async function mockResponse<T>(produce: () => T, latencyMs = MOCK_LATENCY_MS, { auth = true }: {auth?: boolean;} = {}): Promise<T> {
  const hooks = auth ? authHooks : null;
  if (!hooks) return send(produce, latencyMs, null);
  await hooks.ensureFresh();
  const token = hooks.accessToken();
  try {
    return await send(produce, latencyMs, token);
  } catch (e) {
    if (!isUnauthorized(e) || !token) throw e;
    if (await hooks.refresh()) return send(produce, latencyMs, hooks.accessToken());
    hooks.onSessionExpired();
    throw e;
  }
}
