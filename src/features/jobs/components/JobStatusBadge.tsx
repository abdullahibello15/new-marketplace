import { StatusBadge } from '../../../components/ui/StatusBadge';
import { JOB_STATUS_META } from '../constants';
import type { JobStatus } from '../types';

/** One colour per status, plus a dot and the label, so status never relies on colour alone. Used by both apps. */
export function JobStatusBadge({ status, className = '' }: {status: JobStatus;className?: string;}) {
  return <StatusBadge meta={JOB_STATUS_META[status]} className={className} />;
}
