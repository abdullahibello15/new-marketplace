import { format, formatDistanceToNow, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import i18n from '../i18n';
import { haLocale } from '../i18n/dateLocale';
import { tradeLabel } from '../i18n/labels';
import type { VendorProfileInput } from '../types/marketplace';

/*
 * THE shared formatters. Dates and times follow the UI language (English or Hausa); ₦ amounts and
 * numbers are written the same way in both languages (₦12,500), so prices always look the same.
 */

/** The date-fns locale for the current UI language. */
export const dateLocale = () => dateLocaleFor(i18n.resolvedLanguage);

/** The date-fns locale for a given language (e.g. a message recipient's, not the current UI's). */
export const dateLocaleFor = (language: string | undefined) => language === 'ha' ? haLocale : enUS;

/** Like formatDate, in a given language: for messages written to someone else. */
export function formatDateIn(date: Date | string | number, pattern: string, language: string): string {
  return format(new Date(date), pattern, { locale: dateLocaleFor(language) });
}

export function formatTrade({ tradeCategory, tradeCategoryOther }: VendorProfileInput): string {
  // A custom trade the vendor typed is their own words: shown as written.
  if (tradeCategory === 'other') return tradeCategoryOther?.trim() || tradeLabel('other');
  return tradeLabel(tradeCategory);
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/** Plain numbers (counts, stock), formatted like amounts in every language. */
export const formatNumber = (n: number) => n.toLocaleString('en-NG');

/** "₦2,000 – ₦15,000", or a single price when min and max match. */
export function formatPriceRange(min: number, max: number): string {
  return min === max ? formatNaira(min) : `${formatNaira(min)} – ${formatNaira(max)}`;
}

/** A date in the UI language with a date-fns pattern ("d MMM yyyy", "EEE d MMM, h:mm a"…). */
export function formatDate(date: Date | string | number, pattern: string): string {
  return format(new Date(date), pattern, { locale: dateLocale() });
}

/** "5 minutes ago" / "minti 5 da suka wuce". */
export function formatAgo(date: Date | string | number, { strict = false } = {}): string {
  const d = new Date(date);
  return strict ? formatDistanceToNowStrict(d, { addSuffix: true, locale: dateLocale() }) : formatDistanceToNow(d, { addSuffix: true, locale: dateLocale() });
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return i18n.t('common:date.today');
  if (isTomorrow(d)) return i18n.t('common:date.tomorrow');
  if (isYesterday(d)) return i18n.t('common:date.yesterday');
  return formatDate(d, 'EEE, d MMM');
}

export function formatTime(iso: string): string {
  return formatDate(iso, 'h:mm a');
}
