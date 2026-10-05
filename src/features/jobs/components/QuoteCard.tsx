import React from 'react';
import { format } from 'date-fns';
import { Badge } from '../../../components/ui/Badge';
import { Price } from '../../../components/ui/Price';
import { durationLabel, isQuoteExpired, quoteExpiryText } from '../utils/quote';
import type { JobQuote } from '../types';

interface QuoteCardProps {
  quote: JobQuote;
  /** True once accepted: shows "Agreed" instead of the expiry. */
  agreed?: boolean;
  /** The booked start once agreed; differs from the quote's proposed time after a reschedule. */
  bookedFor?: string | null;
  /** Accept/Reject buttons, or a note, under the quote. */
  footer?: React.ReactNode;
}

/** A vendor's quote: price, what's included, duration, proposed time and expiry. Used by both apps. */
export function QuoteCard({ quote, agreed = false, bookedFor = null, footer }: QuoteCardProps) {
  const expired = isQuoteExpired(quote);
  return (
    <section aria-labelledby="quote-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="quote-heading" className="text-sm font-semibold text-muted">
          {agreed ? 'Agreed price' : 'Quote'}
        </h2>
        {agreed ?
        <Badge tone="success" dot>
            Locked in
          </Badge> :

        <Badge tone={expired ? 'danger' : 'warning'} dot>
            {quoteExpiryText(quote)}
          </Badge>
        }
      </div>
      <p className="mt-1 text-3xl font-extrabold text-ink">
        <Price amount={quote.amount} />
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-muted">What’s included</dt>
          <dd className="mt-0.5 whitespace-pre-line text-ink">{quote.includes}</dd>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div>
            <dt className="font-semibold text-muted">{agreed ? 'Booked for' : 'Proposed time'}</dt>
            <dd className="mt-0.5 text-ink">{format(new Date(agreed && bookedFor ? bookedFor : quote.proposedStart), 'EEE d MMM, h:mm a')}</dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">Estimated time</dt>
            <dd className="mt-0.5 text-ink">{durationLabel(quote.durationHours)}</dd>
          </div>
        </div>
      </dl>
      {footer && <div className="mt-4 border-t border-line pt-4">{footer}</div>}
    </section>);

}
