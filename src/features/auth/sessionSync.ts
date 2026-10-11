/*
 * Keeps the app's tabs in step: signing out (or being signed out) in one tab signs out the others, a sign-in
 * lets them pick the session up, and activity in any tab counts for the idle timer. BroadcastChannel where
 * the browser has it, otherwise a localStorage "storage" event. Messages never carry tokens.
 */

export type SessionSyncMessage =
{type: 'signed_out';userId: string | null;reason: 'logout' | 'expired' | 'idle';} |
{type: 'signed_in';userId: string;} |
{type: 'activity';};

const CHANNEL = 'gwani-auth';
const STORAGE_KEY = 'gwani:auth-event';

let channel: BroadcastChannel | null | undefined;
const listeners = new Set<(m: SessionSyncMessage) => void>();
let listening = false;

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  return channel;
}

function deliver(m: SessionSyncMessage) {
  listeners.forEach((l) => l(m));
}

function startListening() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const ch = getChannel();
  if (ch) {
    ch.onmessage = (e: MessageEvent<SessionSyncMessage>) => deliver(e.data);
    return;
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      deliver((JSON.parse(e.newValue) as {m: SessionSyncMessage;}).m);
    } catch {
      // Not ours.
    }
  });
}

/** Tells the OTHER tabs (a tab never hears its own messages). */
export function broadcastSession(m: SessionSyncMessage): void {
  if (typeof window === 'undefined') return;
  const ch = getChannel();
  if (ch) {
    ch.postMessage(m);
    return;
  }
  try {
    // A unique value each time, so repeated messages still fire the storage event.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ m, at: Date.now(), n: Math.random() }));
  } catch {
    // Storage blocked: other tabs find out on their next request.
  }
}

export function onSessionMessage(listener: (m: SessionSyncMessage) => void): () => void {
  startListening();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
