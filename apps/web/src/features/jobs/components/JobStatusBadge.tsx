import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { jobStatusLabel } from '../../../i18n/labels';
import { JOB_STATUS_META } from '../constants';
import type { JobStatus } from '../types';

/** One colour per status, plus a dot and the label, so status never relies on colour alone. Used by both apps. */
export function JobStatusBadge({ status, className = '' }: {status: JobStatus;className?: string;}) {
  useTranslation();
  const meta = JOB_STATUS_META[status];
  return <StatusBadge meta={{ ...meta, label: jobStatusLabel(status, meta.label) }} className={className} />;
}
