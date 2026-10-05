import { formatDistanceStrict } from 'date-fns';
import { QUOTE_DURATIONS } from '../constants';
import type { JobQuote } from '../types';

export const isQuoteExpired = (quote: Pick<JobQuote, 'expiresAt'>, now = new Date()) => new Date(quote.expiresAt) <= now;

/** "Expires in 2 days" / "Expired 3 hours ago". */
export function quoteExpiryText(quote: Pick<JobQuote, 'expiresAt'>, now = new Date()): string {
  const distance = formatDistanceStrict(new Date(quote.expiresAt), now);
  return isQuoteExpired(quote, now) ? `Expired ${distance} ago` : `Expires in ${distance}`;
}

export function durationLabel(hours: number): string {
  return QUOTE_DURATIONS.find((d) => d.hours === hours)?.label ?? `About ${hours} hours`;
}
