import { format } from 'date-fns';
import { ArrowRightIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '../../../../components/ui/Badge';
import { JOB_ACTOR, RESCHEDULE_STATUS_LABELS } from '../../constants';
import type { Job, RescheduleStatus } from '../../types';

const TONE: Record<RescheduleStatus, BadgeTone> = { pending: 'warning', accepted: 'success', declined: 'neutral' };
const short = (iso: string) => format(new Date(iso), 'EEE d MMM, h:mm a');

/** Every reschedule request on the job, oldest first. Shown under the timeline. */
export function RescheduleHistory({ job }: {job: Pick<Job, 'reschedules' | 'customerName' | 'vendorName'>;}) {
  if (job.reschedules.length === 0) return null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Reschedule history</h3>
      <ol className="mt-2 space-y-2">
        {job.reschedules.map((r) =>
        <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-ink">{r.requestedBy === JOB_ACTOR.Customer ? job.customerName : job.vendorName}</span>
            <span className="inline-flex items-center gap-1 text-muted">
              {short(r.fromStart)}
              <ArrowRightIcon className="h-3.5 w-3.5" aria-label="to" />
              {short(r.proposedStart)}
            </span>
            <Badge tone={TONE[r.status]}>{RESCHEDULE_STATUS_LABELS[r.status]}</Badge>
          </li>
        )}
      </ol>
    </div>);

}
