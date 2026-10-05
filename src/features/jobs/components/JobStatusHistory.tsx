import { format } from 'date-fns';
import { JOB_ACTOR, JOB_ACTOR_LABELS } from '../constants';
import { JobStatusBadge } from './JobStatusBadge';
import type { Job, JobActor } from '../types';

interface JobStatusHistoryProps {
  job: Pick<Job, 'history' | 'customerName' | 'vendorName'>;
  /** Whose screen this is, so their own changes read "You". */
  viewer: Exclude<JobActor, 'system'>;
}

/** Audit trail: every status change, who made it and when, newest first. */
export function JobStatusHistory({ job, viewer }: JobStatusHistoryProps) {
  const who = (by: JobActor) =>
  by === viewer ? 'You' : by === JOB_ACTOR.Customer ? job.customerName : by === JOB_ACTOR.Vendor ? job.vendorName : JOB_ACTOR_LABELS.system;

  return (
    <ol className="space-y-3" aria-label="Status history">
      {[...job.history].reverse().map((h, i) =>
      <li key={`${h.status}-${h.at}-${i}`} className="flex items-start gap-3">
          <JobStatusBadge status={h.status} className="mt-0.5" />
          <div className="min-w-0 text-sm">
            <p className="text-ink">
              <span className="font-semibold">{who(h.by)}</span>
              <span className="text-muted"> · </span>
              <time dateTime={h.at} className="text-muted">
                {format(new Date(h.at), 'd MMM yyyy, h:mm a')}
              </time>
            </p>
            {h.note && <p className="mt-0.5 italic text-muted">“{h.note}”</p>}
          </div>
        </li>
      )}
    </ol>);

}
