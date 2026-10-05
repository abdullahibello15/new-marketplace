import { JOB_STATUS_META } from '../constants';
import type { JobStatus } from '../types';

/** One colour per status, plus a dot and the label, so status never relies on colour alone. Used by both apps. */
export function JobStatusBadge({ status, className = '' }: {status: JobStatus;className?: string;}) {
  const meta = JOB_STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${meta.badgeClass} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>);

}
