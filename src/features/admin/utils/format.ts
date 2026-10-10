import { differenceInMinutes } from 'date-fns';
import type { Claim, ResponseDeadline } from '../types';

/**
 * Masks a sensitive ID number: only the last 4 characters show ("•••••••4821"). Every list view and the
 * default detail view use this; a full number is only shown after a deliberate, logged reveal.
 */
export function maskIdNumber(value: string | null): string {
  if (!value) return '—';
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return '•'.repeat(clean.length);
  return `${'•'.repeat(Math.min(7, clean.length - 4))}${clean.slice(-4)}`;
}

/** "2h 15m", "3d 4h" or "45m", for countdowns. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(Math.abs(minutes)));
  const days = Math.floor(m / 1440);
  const hours = Math.floor(m % 1440 / 60);
  const mins = m % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export type DeadlineState = 'none' | 'done' | 'due' | 'soon' | 'overdue';

/** Where a party's response deadline stands now. "Soon" = less than 12 hours left. */
export function deadlineState(deadline: ResponseDeadline | null, now = new Date()): {state: DeadlineState;minutesLeft: number;} {
  if (!deadline) return { state: 'none', minutesLeft: 0 };
  if (deadline.respondedAt) return { state: 'done', minutesLeft: 0 };
  const minutesLeft = differenceInMinutes(new Date(deadline.dueAt), now);
  if (minutesLeft < 0) return { state: 'overdue', minutesLeft };
  return { state: minutesLeft < 12 * 60 ? 'soon' : 'due', minutesLeft };
}

/** A claim counts only until it expires. */
export const activeClaim = (claim: Claim | null, now = new Date()): Claim | null => claim && new Date(claim.expiresAt) > now ? claim : null;
