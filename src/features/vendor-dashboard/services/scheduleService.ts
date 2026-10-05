import { isBefore, startOfToday } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { fromDateKey, isDateKey } from '../../../lib/dates';
import { mockBlockedDates } from '../mock/blockedDates';
import type { BlockedDate } from '../types';

let blockedDates: BlockedDate[] = structuredClone(mockBlockedDates);

function assertBlockableKey(dateKey: string): void {
  if (!isDateKey(dateKey)) throw new ApiError('That date isn’t valid.', 400);
  if (isBefore(fromDateKey(dateKey), startOfToday())) throw new ApiError('You can’t change days that have passed.', 400);
}

/** GET /vendor/schedule/blocked-dates */
export function listBlockedDates(): Promise<BlockedDate[]> {
  return mockResponse(() => blockedDates);
}

/** POST /vendor/schedule/blocked-dates { date } */
export function blockDate(dateKey: string): Promise<BlockedDate> {
  return mockResponse(() => {
    assertBlockableKey(dateKey);
    const existing = blockedDates.find((b) => b.date === dateKey);
    if (existing) return existing;
    const created: BlockedDate = { date: dateKey, createdAt: new Date().toISOString() };
    blockedDates = [...blockedDates, created];
    return created;
  });
}

/** DELETE /vendor/schedule/blocked-dates/:date */
export function unblockDate(dateKey: string): Promise<void> {
  return mockResponse(() => {
    assertBlockableKey(dateKey);
    blockedDates = blockedDates.filter((b) => b.date !== dateKey);
  });
}
