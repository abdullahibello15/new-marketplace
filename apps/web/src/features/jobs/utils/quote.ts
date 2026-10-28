import { formatDistanceStrict } from 'date-fns';
import i18n from '../../../i18n';
import { quoteDurationLabel } from '../../../i18n/labels';
import { dateLocale } from '../../../utils/format';
import { QUOTE_DURATIONS } from '../constants';
import type { JobQuote } from '../types';

export const isQuoteExpired = (quote: Pick<JobQuote, 'expiresAt'>, now = new Date()) => new Date(quote.expiresAt) <= now;

/** "Expires in 2 days" / "Expired 3 hours ago". */
export function quoteExpiryText(quote: Pick<JobQuote, 'expiresAt'>, now = new Date()): string {
  const distance = formatDistanceStrict(new Date(quote.expiresAt), now, { locale: dateLocale() });
  return isQuoteExpired(quote, now) ? i18n.t('jobs:quoteExpiry.expiredAgo', { time: distance }) : i18n.t('jobs:quoteExpiry.expiresIn', { time: distance });
}

export function durationLabel(hours: number): string {
  return quoteDurationLabel(hours, QUOTE_DURATIONS.find((d) => d.hours === hours)?.label);
}
