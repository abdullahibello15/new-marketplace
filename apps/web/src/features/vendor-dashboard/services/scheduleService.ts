import i18n from '../../../i18n';
import { isBefore, startOfToday } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { fromDateKey, isDateKey } from '../../../lib/dates';
import { mockBlockedDates } from '../mock/blockedDates';
import type { BlockedDate } from '../types';

let blockedDates: BlockedDate[] = structuredClone(mockBlockedDates);

function assertBlockableKey(dateKey: string): void {
  if (!isDateKey(dateKey)) throw new ApiError(i18n.t('vendor:error.badDate'), 400);
  if (isBefore(fromDateKey(dateKey), startOfToday())) throw new ApiError(i18n.t('vendor:error.pastDay'), 400);
}

/** Sync read for admin analytics (the signed-in vendor's blocked days, "yyyy-MM-dd"). */
export function blockedDatesSnapshot(): readonly string[] {
  return blockedDates.map((b) => b.date);
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
