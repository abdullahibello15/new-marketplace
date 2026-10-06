import { Link } from 'react-router-dom';
import { format } from 'date-fns';
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
import { useWorkingHours } from '../../hooks/useWorkingHours';
import { MarkDoneCard } from './MarkDoneCard';
import { SendQuoteDialog } from './SendQuoteDialog';
import { StartJobCard } from './StartJobCard';
import type { Job } from '../../../jobs/types';

/** What the vendor can do or see next, depending on the job's status. */
export function VendorJobPanel({ job }: {job: Job;}) {
  const a = useJobActions(job);
  const { replaceJob } = useRequests();
  const workingHours = useWorkingHours();
  const booked = BOOKED_JOB_STATUSES.includes(job.status) && job.scheduledAt !== null;
  const confirmBy = autoConfirmAt(job);

  return (
    <div className="space-y-5">
      {job.status === JOB_STATUS.Requested &&
      <>
          <section aria-labelledby="respond-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
            <h2 id="respond-heading" className="text-base font-bold text-ink">Respond to this request</h2>
            <p className="mt-0.5 text-sm text-muted">Send a fixed quote, or decline if you can’t take it.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" icon={XIcon} onClick={a.openDecline}>
                Decline
              </Button>
              <Button icon={SendIcon} onClick={a.openQuote}>
                Send quote
              </Button>
            </div>
          </section>
          <SendQuoteDialog open={a.dialog === 'quote'} job={job} workingHours={workingHours} onSend={a.sendQuote} onClose={a.close} />
          <ReasonDialog
          open={a.dialog === 'decline'}
          title="Decline this request?"
          description={`${job.customerName} will be told you can’t take this job. You can’t undo this.`}
          reasonLabel="Reason for the customer"
          placeholder="e.g. Fully booked that week, outside my area"
          confirmLabel="Decline request"
          onConfirm={a.decline}
          onCancel={a.close} />

        </>
      }

      {job.cancellation && <CancellationNotice job={job} cancellation={job.cancellation} viewer="vendor" />}

      {job.status === JOB_STATUS.Scheduled && <StartJobCard job={job} busy={a.busy === 'start'} onStart={a.start} />}

      {job.arrival && <ArrivalNotice arrival={job.arrival} who="You" />}

      {job.status === JOB_STATUS.InProgress && <MarkDoneCard job={job} busy={a.busy === 'done'} onDone={a.markDone} />}

      {job.status === JOB_STATUS.AwaitingConfirmation &&
      <p role="status" className="flex items-start gap-2.5 rounded-2xl bg-[#FFF4E5] px-4 py-3 text-sm text-ink">
          <HourglassIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#8A4B00]" aria-hidden="true" />
          <span>
            Waiting for {job.customerName} to confirm.
            {confirmBy && ` If they don’t reply, it’s confirmed automatically on ${format(confirmBy, 'EEE d MMM, h:mm a')}.`}
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
        <p className="text-sm text-muted">Waiting for {job.customerName} to accept or reject.</p> :
        booked && job.scheduledAt ?
        <Link to={DASHBOARD_ROUTES.calendarDay(toDateKey(new Date(job.scheduledAt)))} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
                <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                See it on your calendar
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
