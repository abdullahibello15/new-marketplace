import i18n from '../../../i18n';
import { formatDate } from '../../../utils/format';
import { RESPONSE_TIME_LABELS } from '../constants';

/** The reason subscriptionService gives suspended vendors (kept in sync; translated for customers). */
const SUSPENDED_REASON = 'Temporarily unavailable';
import type { CategoryKind, Vendor } from '../../../types/marketplace';

/** "within 1 hour", or null when there's no response-time data to show. */
export function responseTimeLabel(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return null;
  const bucket = RESPONSE_TIME_LABELS.find((b) => minutes <= b.maxMinutes);
  if (!bucket) return null;
  return i18n.t(`discovery:profile.responseTime.${Number.isFinite(bucket.maxMinutes) ? bucket.maxMinutes : 'max'}`, { defaultValue: bucket.label });
}

/** Why the Book/Request button is off, or null when the vendor is taking new work. */
export function bookingBlockedReason(vendor: Vendor, kind: CategoryKind, hasItems: boolean): string | null {
  const what = kind === 'retail' ? 'orders' : 'bookings';
  if (vendor.unavailable) {
    // The system's own reason is translated; a reason the vendor wrote is shown as they wrote it.
    const raw = vendor.unavailable.reason;
    const reason = raw === SUSPENDED_REASON ? i18n.t('discovery:profile.suspendedReason') : raw;
    return vendor.unavailable.until ?
    i18n.t(`discovery:profile.blocked.${what}Until`, { reason, date: formatDate(vendor.unavailable.until, 'EEE d MMM') }) :
    i18n.t(`discovery:profile.blocked.${what}Now`, { reason });
  }
  if (!hasItems) return i18n.t(kind === 'retail' ? 'discovery:profile.blocked.nothingToRequest' : 'discovery:profile.blocked.nothingToBook');
  return null;
}
