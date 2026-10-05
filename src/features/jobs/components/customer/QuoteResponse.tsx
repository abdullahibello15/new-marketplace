import { format } from 'date-fns';
import { CheckIcon, XIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatNaira } from '../../../../utils/format';
import { JOB_STATUS } from '../../constants';
import { useQuoteResponse } from '../../hooks/useQuoteResponse';
import { isQuoteExpired } from '../../utils/quote';
import { QuoteCard } from '../QuoteCard';
import { ReasonDialog } from '../ReasonDialog';
import type { Job } from '../../types';

/** The customer's view of the quote: Accept / Reject while it's open, then the agreed booking. */
export function QuoteResponse({ job, onUpdated }: {job: Job;onUpdated: (job: Job) => void;}) {
  const r = useQuoteResponse(job, onUpdated);
  const quote = job.quote;
  if (!quote) return null;

  const awaitingAnswer = job.status === JOB_STATUS.Quoted;
  const expired = isQuoteExpired(quote);
  const agreed = job.agreedPrice !== null;

  return (
    <>
      <QuoteCard
        quote={quote}
        agreed={agreed}
        bookedFor={job.scheduledAt}
        footer={
        awaitingAnswer ?
        <div>
              {expired &&
          <p className="mb-3 text-sm font-semibold text-clay-dark" id={`quote-${job.id}-expired`}>
                  This quote has expired, so it can’t be accepted. Message {job.vendorName} to ask for a new one.
                </p>
          }
              <div className="grid grid-cols-2 gap-3">
                <Button
              variant="outline"
              icon={XIcon}
              onClick={r.askReject}
              disabled={expired}
              aria-describedby={expired ? `quote-${job.id}-expired` : undefined}>

                  Reject
                </Button>
                <Button icon={CheckIcon} onClick={r.askAccept} disabled={expired} aria-describedby={expired ? `quote-${job.id}-expired` : undefined}>
                  Accept
                </Button>
              </div>
            </div> :
        undefined
        } />


      <ConfirmDialog
        open={r.pending === 'accept'}
        title="Accept this quote?"
        description={`You’re booking ${job.vendorName} for ${formatNaira(quote.amount)} on ${format(new Date(quote.proposedStart), 'EEE d MMM')} at ${format(
          new Date(quote.proposedStart),
          'h:mm a'
        )}. The price and time will be locked in.`}
        confirmLabel="Accept and book"
        loading={r.accepting}
        onConfirm={r.confirmAccept}
        onCancel={r.cancel} />


      <ReasonDialog
        open={r.pending === 'reject'}
        title="Reject this quote?"
        description={`${job.vendorName} will be told you’ve turned it down. You can’t undo this.`}
        reasonLabel="Reason for the vendor"
        placeholder="e.g. Over my budget, found someone closer"
        confirmLabel="Reject quote"
        onConfirm={r.confirmReject}
        onCancel={r.cancel} />

    </>);

}
