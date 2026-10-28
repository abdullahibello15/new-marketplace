import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { CalendarDaysIcon, HourglassIcon, SendIcon, XIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { toDateKey } from '../../../../lib/dates';
import { BOOKED_JOB_STATUSES, JOB_STATUS } from '../../../jobs/constants';
import { QuoteCard } from '../../../jobs/components/QuoteCard';
import { ReasonDialog } from '../../../jobs/components/ReasonDialog';
import { CancelJobAction } from '../../../jobs/components/cancel/CancelJobAction';
import { CancellationNotice } from '../../../jobs/components/cancel/CancellationNotice';
import { ArrivalNotice } from '../../../jobs/components/lifecycle/ArrivalNotice';
import { DisputeNotice } from '../../../jobs/components/lifecycle/DisputeNotice';
import { JobReviewDisplay } from '../../../jobs/components/lifecycle/JobReviewDisplay';
import { RescheduleSection } from '../../../jobs/components/reschedule/RescheduleSection';
import { autoConfirmAt } from '../../../jobs/stateMachine';
import { PaymentCard } from '../../../payments/components/PaymentCard';
import { DisputeResolutionDemo } from '../../../payments/components/escrow/DisputeResolutionDemo';
import { useRequests } from '../../hooks/useRequests';
import { DASHBOARD_ROUTES } from '../../constants';
import { useJobActions } from '../../hooks/useJobActions';
import { useSubscriptionStanding } from '../../hooks/useSubscriptionStanding';
import { useWorkingHours } from '../../hooks/useWorkingHours';
import { SUBSCRIPTION_STATUS } from '../../constants';
import { MarkDoneCard } from './MarkDoneCard';
import { SendQuoteDialog } from './SendQuoteDialog';
import { StartJobCard } from './StartJobCard';
import type { Job } from '../../../jobs/types';

/** What the vendor can do or see next, depending on the job's status. */
export function VendorJobPanel({ job }: {job: Job;}) {
  const { t } = useTranslation('vendor');
  const a = useJobActions(job);
  const { replaceJob } = useRequests();
  const workingHours = useWorkingHours();
  const booked = BOOKED_JOB_STATUSES.includes(job.status) && job.scheduledAt !== null;
  const confirmBy = autoConfirmAt(job);
  // Soft suspension: existing jobs carry on, but no new quotes (the service refuses them too).
  const { standing, renew, renewing } = useSubscriptionStanding();
  const suspended = standing?.status === SUBSCRIPTION_STATUS.Suspended;
  const coveredBy = standing?.coveredBy && !standing.coveredBy.removed ? standing.coveredBy : null;

  return (
    <div className="space-y-5">
      {job.status === JOB_STATUS.Requested &&
      <>
          <section aria-labelledby="respond-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
            <h2 id="respond-heading" className="text-base font-bold text-ink">{t('request.respondTitle')}</h2>
            <p className="mt-0.5 text-sm text-muted">{t('request.respondText')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" icon={XIcon} onClick={a.openDecline}>
                {t('request.decline')}
              </Button>
              <Button icon={SendIcon} onClick={a.openQuote} disabled={suspended} aria-describedby={suspended ? 'quote-suspended-note' : undefined}>
                {t('request.sendQuote')}
              </Button>
            </div>
            {suspended &&
          <div id="quote-suspended-note" className="mt-3 flex flex-col gap-2 rounded-lg bg-clay-soft px-3 py-2.5 text-sm text-ink sm:flex-row sm:items-center">
                <p className="flex-1">
                  {coveredBy ?
              t('request.suspendedBundle', { name: coveredBy.associationName }) :
              t('request.suspended')}
                </p>
                {!coveredBy &&
            <Button size="sm" variant="danger" onClick={() => void renew()} loading={renewing} className="shrink-0">
                    {t('request.renewNow')}
                  </Button>
            }
              </div>
          }
          </section>
          <SendQuoteDialog open={a.dialog === 'quote'} job={job} workingHours={workingHours} onSend={a.sendQuote} onClose={a.close} />
          <ReasonDialog
          open={a.dialog === 'decline'}
          title={t('request.declineTitle')}
          description={t('request.declineText', { name: job.customerName })}
          reasonLabel={t('request.declineReason')}
          placeholder={t('request.declinePlaceholder')}
          confirmLabel={t('request.declineConfirm')}
          onConfirm={a.decline}
          onCancel={a.close} />

        </>
      }

      {job.cancellation && <CancellationNotice job={job} cancellation={job.cancellation} viewer="vendor" />}

      {job.status === JOB_STATUS.Scheduled && <StartJobCard job={job} busy={a.busy === 'start'} onStart={a.start} />}

      {job.arrival && <ArrivalNotice arrival={job.arrival} who={null} />}

      {job.status === JOB_STATUS.InProgress && <MarkDoneCard job={job} busy={a.busy === 'done'} onDone={a.markDone} />}

      {job.status === JOB_STATUS.AwaitingConfirmation &&
      <p role="status" className="flex items-start gap-2.5 rounded-2xl bg-[#FFF4E5] px-4 py-3 text-sm text-ink">
          <HourglassIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#8A4B00]" aria-hidden="true" />
          <span>
            {t('request.waitingConfirm', { name: job.customerName })}
            {confirmBy && t('request.waitingConfirmAuto', { date: formatDate(confirmBy, 'EEE d MMM, h:mm a') })}
          </span>
        </p>
      }

      <PaymentCard kind="job" id={job.id} refreshKey={job.updatedAt} viewer="vendor" otherName={job.customerName} />

      {job.dispute && <DisputeNotice dispute={job.dispute} viewer="vendor" />}
      <DisputeResolutionDemo job={job} onUpdated={replaceJob} />
      {job.review && <JobReviewDisplay job={job} review={job.review} />}

      {job.quote &&
      <QuoteCard
        quote={job.quote}
        agreed={job.agreedPrice !== null}
        bookedFor={job.scheduledAt}
        footer={
        job.status === JOB_STATUS.Quoted ?
        <p className="text-sm text-muted">{t('request.waitingAnswer', { name: job.customerName })}</p> :
        booked && job.scheduledAt ?
        <Link to={DASHBOARD_ROUTES.calendarDay(toDateKey(new Date(job.scheduledAt)))} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
                <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                {t('request.seeCalendar')}
              </Link> :
        undefined
        } />

      }

      {job.status === JOB_STATUS.Scheduled &&
      <RescheduleSection job={job} viewer="vendor" workingHours={workingHours} busy={a.busy} onRequest={a.requestReschedule} onRespond={a.respondReschedule} />
      }

      <CancelJobAction job={job} actor="vendor" busy={a.busy === 'cancel'} onCancel={a.cancel} />
    </div>);

}
