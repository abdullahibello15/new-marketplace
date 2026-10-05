import { format } from 'date-fns';
import { RESPONSE_TIME_LABELS } from '../constants';
import type { CategoryKind, Vendor } from '../../../types/marketplace';

/** "within 1 hour", or null when there's no response-time data to show. */
export function responseTimeLabel(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return null;
  return RESPONSE_TIME_LABELS.find((b) => minutes <= b.maxMinutes)?.label ?? null;
}

/** Why the Book/Request button is off, or null when the vendor is taking new work. */
export function bookingBlockedReason(vendor: Vendor, kind: CategoryKind, hasItems: boolean): string | null {
  const noun = kind === 'retail' ? 'orders' : 'bookings';
  if (vendor.unavailable) {
    const until = vendor.unavailable.until ? ` until ${format(new Date(vendor.unavailable.until), 'EEE d MMM')}` : ' right now';
    return `${vendor.unavailable.reason}: not taking new ${noun}${until}.`;
  }
  if (!hasItems) return `This vendor hasn’t listed anything to ${kind === 'retail' ? 'request' : 'book'} yet.`;
  return null;
}
