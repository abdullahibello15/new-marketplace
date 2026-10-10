import { useTranslation } from 'react-i18next';
import { CheckIcon, XIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatDate, formatNaira } from '../../../../utils/format';
import { JOB_STATUS } from '../../constants';
import { useQuoteResponse } from '../../hooks/useQuoteResponse';
import { isQuoteExpired } from '../../utils/quote';
import { QuoteCard } from '../QuoteCard';
import { ReasonDialog } from '../ReasonDialog';
import type { Job } from '../../types';

/** The customer's view of the quote: Accept / Reject while it's open, then the agreed booking. */
export function QuoteResponse({ job, onUpdated }: {job: Job;onUpdated: (job: Job) => void;}) {
  const { t } = useTranslation('jobs');
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
                  {t('quoteResponse.expired', { name: job.vendorName })}
                </p>
          }
              <div className="grid grid-cols-2 gap-3">
                <Button
              variant="outline"
              icon={XIcon}
              onClick={r.askReject}
              disabled={expired}
              aria-describedby={expired ? `quote-${job.id}-expired` : undefined}>

                  {t('quoteResponse.reject')}
                </Button>
                <Button icon={CheckIcon} onClick={r.askAccept} disabled={expired} aria-describedby={expired ? `quote-${job.id}-expired` : undefined}>
                  {t('quoteResponse.accept')}
                </Button>
              </div>
            </div> :
        undefined
        } />


      <ConfirmDialog
        open={r.pending === 'accept'}
        title={t('quoteResponse.acceptTitle')}
        description={t('quoteResponse.acceptText', {
          name: job.vendorName,
          amount: formatNaira(quote.amount),
          date: formatDate(quote.proposedStart, 'EEE d MMM'),
          time: formatDate(quote.proposedStart, 'h:mm a')
        })}
        confirmLabel={t('quoteResponse.acceptConfirm')}
        loading={r.accepting}
        onConfirm={r.confirmAccept}
        onCancel={r.cancel} />


      <ReasonDialog
        open={r.pending === 'reject'}
        title={t('quoteResponse.rejectTitle')}
        description={t('quoteResponse.rejectText', { name: job.vendorName })}
        reasonLabel={t('quoteResponse.rejectReason')}
        placeholder={t('quoteResponse.rejectPlaceholder')}
        confirmLabel={t('quoteResponse.rejectConfirm')}
        onConfirm={r.confirmReject}
        onCancel={r.cancel} />

    </>);

}
