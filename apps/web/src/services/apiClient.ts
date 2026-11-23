import { ApiError } from "./mockApi";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "";
let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export interface ApiSession {
  user: any;
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
}

export function setApiAccessToken(value: string | null) {
  accessToken = value;
}

export function getApiAccessToken() {
  return accessToken;
}

async function refreshAccess(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const session = (await response.json()) as ApiSession;
        accessToken = session.accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (
    response.status === 401 &&
    retry &&
    path !== "/v1/auth/refresh" &&
    (await refreshAccess())
  ) {
    const retriedHeaders = new Headers(init.headers);
    if (init.body && !retriedHeaders.has("content-type"))
      retriedHeaders.set("content-type", "application/json");
    if (accessToken)
      retriedHeaders.set("authorization", `Bearer ${accessToken}`);
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: retriedHeaders,
      credentials: "include",
    });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.error?.message ?? "The request could not be completed.",
      response.status,
      body?.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function establishApiSession(session: ApiSession) {
  setApiAccessToken(session.accessToken);
  return {
    accessToken: session.accessToken,
    accessExpiresAt: session.accessExpiresAt,
    sessionId: session.sessionId,
  };
}
