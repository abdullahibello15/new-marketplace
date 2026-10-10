import { useCallback } from 'react';
import { format } from 'date-fns';
import { ScrollTextIcon } from 'lucide-react';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ADMIN_ROLES } from '../config/roles';
import { AUDIT_ACTION_LABELS } from '../constants';
import { getAuditFor } from '../services/auditService';
import type { AuditTargetType } from '../types';

interface AuditTrailProps {
  type: AuditTargetType;
  id: string;
  /** Change it (e.g. after an action) to reload. */
  refreshKey?: unknown;
}

/** The audit entries for one item, inside its detail view. Read-only. */
export function AuditTrail({ type, id, refreshKey }: AuditTrailProps) {
  // refreshKey is only a trigger to reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => getAuditFor(type, id), [type, id, refreshKey]);
  const { data, status, error, reload } = useAsyncData(load);

  return (
    <section aria-labelledby={`audit-${id}`} className="rounded-2xl border border-line bg-white p-4">
      <h2 id={`audit-${id}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <ScrollTextIcon className="h-4 w-4" aria-hidden="true" />
        Audit trail
      </h2>
      {status === 'error' && <ErrorState message={error ?? ''} onRetry={reload} />}
      {!data && status === 'loading' && <LoadingState label="Loading audit trail" rows={2} rowClassName="h-10" />}
      {data && (
      data.length === 0 ?
      <p className="mt-2 text-sm text-muted">No admin actions yet.</p> :

      <ol className="mt-3 space-y-2.5 border-l-2 border-line pl-3 text-sm">
            {data.map((e) =>
        <li key={e.id}>
                <p className="font-semibold text-ink">{AUDIT_ACTION_LABELS[e.action]}</p>
                <p className="text-xs text-muted">
                  {e.actor.name} ({ADMIN_ROLES[e.actor.role].label}) · <time dateTime={e.at}>{format(new Date(e.at), 'd MMM yyyy, h:mm a')}</time>
                </p>
                {e.details && <p className="text-xs text-muted">{e.details}</p>}
                {e.reason && <p className="mt-0.5 text-xs text-ink">Reason: {e.reason}</p>}
              </li>
        )}
          </ol>)
      }
    </section>);

}
