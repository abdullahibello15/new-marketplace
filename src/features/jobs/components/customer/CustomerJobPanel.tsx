import { useState } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useVendors } from '../../../../contexts/VendorsContext';
import { JOB_STATUS } from '../../constants';
import { useCustomerJobActions } from '../../hooks/useCustomerJobActions';
import { PaymentCard } from '../../../payments/components/PaymentCard';
import { DisputeResolutionDemo } from '../../../payments/components/escrow/DisputeResolutionDemo';
import { CancelJobAction } from '../cancel/CancelJobAction';
import { CancellationNotice } from '../cancel/CancellationNotice';
import { ArrivalNotice } from '../lifecycle/ArrivalNotice';
import { DisputeNotice } from '../lifecycle/DisputeNotice';
import { JobReviewDisplay } from '../lifecycle/JobReviewDisplay';
import { RescheduleSection } from '../reschedule/RescheduleSection';
import { ConfirmCompletionCard } from './ConfirmCompletionCard';
import { QuoteResponse } from './QuoteResponse';
import { ReportProblemDialog } from './ReportProblemDialog';
import { ReviewPrompt } from './ReviewPrompt';
import type { Job } from '../../types';

/** Everything the customer can see or do next, depending on where the job is. */
export function CustomerJobPanel({ job, onUpdated }: {job: Job;onUpdated: (job: Job) => void;}) {
  const a = useCustomerJobActions(job, onUpdated);
  const [reporting, setReporting] = useState(false);
  // Reschedule times must fit the vendor's working hours.
  const workingHours = useVendors().getVendor(job.vendorId)?.workingHours;

  return (
    <div className="space-y-5">
      {job.cancellation && <CancellationNotice job={job} cancellation={job.cancellation} viewer="customer" />}

      {job.arrival && <ArrivalNotice arrival={job.arrival} who={job.vendorName} />}

      {job.status === JOB_STATUS.InProgress &&
      <section aria-labelledby="in-progress-help" className="rounded-2xl border border-line bg-white p-4 text-sm">
          <h2 id="in-progress-help" className="font-bold text-ink">Something wrong?</h2>
          <p className="mt-1 text-muted">The job has started, so it can’t be cancelled. If there’s a problem, report it and Gwani will step in.</p>
          <Button variant="outline" size="sm" icon={TriangleAlertIcon} onClick={() => setReporting(true)} className="mt-3">
            Report a problem
          </Button>
          <ReportProblemDialog open={reporting} vendorName={job.vendorName} onSubmit={a.report} onClose={() => setReporting(false)} />
        </section>
      }

      {job.status === JOB_STATUS.AwaitingConfirmation && <ConfirmCompletionCard job={job} busy={a.busy} onConfirm={a.confirm} onReport={a.report} />}

      {job.status === JOB_STATUS.Completed && !job.review && <ReviewPrompt job={job} busy={a.busy} onSubmit={a.review} onSkip={a.skip} />}

      {job.dispute && <DisputeNotice dispute={job.dispute} viewer="customer" />}
      <DisputeResolutionDemo job={job} onUpdated={onUpdated} />

      {job.review && <JobReviewDisplay job={job} review={job.review} />}

      {job.quote ?
      <QuoteResponse job={job} onUpdated={onUpdated} /> :
      !job.cancellation &&
      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No quote yet. {job.vendorName} will send one here.</p>

      }

      <PaymentCard kind="job" id={job.id} refreshKey={job.updatedAt} viewer="customer" otherName={job.vendorName} />

      {job.status === JOB_STATUS.Scheduled && workingHours &&
      <RescheduleSection
        job={job}
        viewer="customer"
        workingHours={workingHours}
        busy={a.busy}
        onRequest={a.requestReschedule}
        onRespond={a.respondReschedule} />

      }

      <CancelJobAction job={job} actor="customer" busy={a.busy === 'cancel'} onCancel={a.cancel} />
    </div>);

}
