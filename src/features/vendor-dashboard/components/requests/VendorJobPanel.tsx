import { Link } from 'react-router-dom';
import { CalendarDaysIcon, SendIcon, XIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { toDateKey } from '../../../../lib/dates';
import { BOOKED_JOB_STATUSES, JOB_STATUS } from '../../../jobs/constants';
import { QuoteCard } from '../../../jobs/components/QuoteCard';
import { ReasonDialog } from '../../../jobs/components/ReasonDialog';
import { DASHBOARD_ROUTES } from '../../constants';
import { useJobActions } from '../../hooks/useJobActions';
import { useWorkingHours } from '../../hooks/useWorkingHours';
import { SendQuoteDialog } from './SendQuoteDialog';
import type { Job } from '../../../jobs/types';

/** What the vendor can do or see next, depending on the job's status. */
export function VendorJobPanel({ job }: {job: Job;}) {
  const actions = useJobActions(job);
  const workingHours = useWorkingHours();

  if (job.status === JOB_STATUS.Requested) {
    return (
      <>
        <section aria-labelledby="respond-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h2 id="respond-heading" className="text-base font-bold text-ink">Respond to this request</h2>
          <p className="mt-0.5 text-sm text-muted">Send a fixed quote, or decline if you can’t take it.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" icon={XIcon} onClick={actions.openDecline}>
              Decline
            </Button>
            <Button icon={SendIcon} onClick={actions.openQuote}>
              Send quote
            </Button>
          </div>
        </section>
        <SendQuoteDialog open={actions.dialog === 'quote'} job={job} workingHours={workingHours} onSend={actions.sendQuote} onClose={actions.close} />
        <ReasonDialog
          open={actions.dialog === 'decline'}
          title="Decline this request?"
          description={`${job.customerName} will be told you can’t take this job. You can’t undo this.`}
          reasonLabel="Reason for the customer"
          placeholder="e.g. Fully booked that week, outside my area"
          confirmLabel="Decline request"
          onConfirm={actions.decline}
          onCancel={actions.close} />

      </>);

  }

  if (!job.quote) return null;
  const booked = BOOKED_JOB_STATUSES.includes(job.status) && job.scheduledAt !== null;

  return (
    <QuoteCard
      quote={job.quote}
      agreed={job.agreedPrice !== null}
      footer={
      job.status === JOB_STATUS.Quoted ?
      <p className="text-sm text-muted">Waiting for {job.customerName} to accept or reject.</p> :
      booked && job.scheduledAt ?
      <Link to={DASHBOARD_ROUTES.calendarDay(toDateKey(new Date(job.scheduledAt)))} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            See it on your calendar
          </Link> :
      undefined
      } />);


}
