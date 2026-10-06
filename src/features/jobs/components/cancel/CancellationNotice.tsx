import { format } from 'date-fns';
import { XCircleIcon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import { JOB_ACTOR } from '../../constants';
import type { Job, JobCancellation, JobParty } from '../../types';

/** Who cancelled, when, why, and any fee. Shown to both sides on a cancelled job. */
export function CancellationNotice({ job, cancellation, viewer }: {job: Job;cancellation: JobCancellation;viewer: JobParty;}) {
  const who =
  cancellation.by === viewer ? 'You' : cancellation.by === JOB_ACTOR.Customer ? job.customerName : cancellation.by === JOB_ACTOR.Vendor ? job.vendorName : 'Gwani';
  return (
    <section aria-labelledby="cancelled-heading" className="rounded-2xl border border-line bg-sand p-4 lg:p-5">
      <h2 id="cancelled-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        <XCircleIcon className="h-4 w-4 text-muted" aria-hidden="true" />
        {who} cancelled this job
      </h2>
      <p className="mt-1 text-sm text-muted">{format(new Date(cancellation.at), 'EEE d MMM yyyy, h:mm a')}</p>
      {cancellation.reason && <p className="mt-2 text-sm text-ink">“{cancellation.reason}”</p>}
      {cancellation.fee > 0 &&
      <p className="mt-2 text-sm text-ink">
          Late-cancellation fee: <Price amount={cancellation.fee} className="font-bold" /> <span className="text-muted">(demo only, not charged)</span>
        </p>
      }
    </section>);

}
