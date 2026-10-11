import { MOCK_AUTH } from '../config';
import { AUTH_ROUTES } from '../constants';
import { broadcastSession } from '../sessionSync';

/** Kept through a reset: the visitor's language choice is a preference, not demo data. */
const KEEP = new Set(['gwani:language']);

function clearAppStorage(storage: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (key.startsWith('gwani:') || key.startsWith('gwani.')) && !KEEP.has(key)) keys.push(key);
  }
  keys.forEach((k) => storage.removeItem(k));
}

/**
 * DEV ONLY (test mode): back to the seeded demo accounts. Signs out every tab, clears everything the app
 * saved in this browser (mock user and session "databases", the session flag and cookie, cart, recent
 * searches, preferences) except the language, then reloads, so every in-memory mock starts fresh too.
 * Does nothing outside test mode.
 */
export function resetDemoData(): void {
  if (!MOCK_AUTH) return;
  broadcastSession({ type: 'signed_out', userId: null, reason: 'logout' });
  try {
    clearAppStorage(window.localStorage);
    clearAppStorage(window.sessionStorage);
  } catch {
    // Storage blocked: the reload still resets the in-memory data.
  }
  window.location.assign(AUTH_ROUTES.start);
}
