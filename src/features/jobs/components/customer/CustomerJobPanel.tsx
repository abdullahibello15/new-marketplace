import { useVendors } from '../../../../contexts/VendorsContext';
import { JOB_STATUS } from '../../constants';
import { useCustomerJobActions } from '../../hooks/useCustomerJobActions';
import { ArrivalNotice } from '../lifecycle/ArrivalNotice';
import { DisputeNotice } from '../lifecycle/DisputeNotice';
import { JobReviewDisplay } from '../lifecycle/JobReviewDisplay';
import { RescheduleSection } from '../reschedule/RescheduleSection';
import { ConfirmCompletionCard } from './ConfirmCompletionCard';
import { QuoteResponse } from './QuoteResponse';
import { ReviewPrompt } from './ReviewPrompt';
import type { Job } from '../../types';

/** Everything the customer can see or do next, depending on where the job is. */
export function CustomerJobPanel({ job, onUpdated }: {job: Job;onUpdated: (job: Job) => void;}) {
  const a = useCustomerJobActions(job, onUpdated);
  // Reschedule times must fit the vendor's working hours.
  const workingHours = useVendors().getVendor(job.vendorId)?.workingHours;

  return (
    <div className="space-y-5">
      {job.arrival && <ArrivalNotice arrival={job.arrival} who={job.vendorName} />}

      {job.status === JOB_STATUS.AwaitingConfirmation && <ConfirmCompletionCard job={job} busy={a.busy} onConfirm={a.confirm} onReport={a.report} />}

      {job.status === JOB_STATUS.Completed && !job.review && <ReviewPrompt job={job} busy={a.busy} onSubmit={a.review} onSkip={a.skip} />}

      {job.dispute && <DisputeNotice dispute={job.dispute} viewer="customer" />}

      {job.review && <JobReviewDisplay job={job} review={job.review} />}

      {job.quote ?
      <QuoteResponse job={job} onUpdated={onUpdated} /> :

      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No quote yet. {job.vendorName} will send one here.</p>
      }

      {job.status === JOB_STATUS.Scheduled && workingHours &&
      <RescheduleSection
        job={job}
        viewer="customer"
        workingHours={workingHours}
        busy={a.busy}
        onRequest={a.requestReschedule}
        onRespond={a.respondReschedule} />

      }
    </div>);

}
