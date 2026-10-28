import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { RefreshCwIcon } from 'lucide-react';
import { StatTile } from '../../../../components/StatTile';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { formatNaira } from '../../../../utils/format';
import { ADMIN_ROLES, type AdminRole } from '../../config/roles';
import { DISPUTE_CASE_STATUS_META, MODERATION_TAB_LABELS, VERIFICATION_STATUS_META } from '../../constants';
import { getAdminAnalytics } from '../../services/analyticsService';
import { AnalyticsSkeleton, ChartCard } from './AnalyticsParts';

function Group({ title, children }: {title: string;children: ReactNode;}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{children}</div>
    </section>);

}

/** Live figures from the admin queues (verification, disputes, moderation) and the audit log. Not date-ranged. */
export function QueuesPanel() {
  const { data, status, error, reload } = useAsyncData(getAdminAnalytics);
  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <AnalyticsSkeleton />;
  const v = data.verification;
  const d = data.disputes;
  const m = data.moderation;
  return (
    <div className="space-y-8" aria-busy={status === 'loading'}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Live queue figures (not affected by the date range) · Last updated {format(new Date(), 'h:mm a')}</span>
        <Button variant="ghost" size="sm" icon={RefreshCwIcon} onClick={reload} loading={status === 'loading'} className="ml-auto">
          Refresh
        </Button>
      </div>
      <Group title="Verification">
        {Object.entries(v.byStatus).map(([s, n]) =>
        <StatTile key={s} value={String(n)} label={VERIFICATION_STATUS_META[s as keyof typeof v.byStatus].label} />
        )}
      </Group>
      <p className="-mt-5 text-sm text-muted">Median time from submission to decision: {v.medianHoursToDecision === null ? '—' : `${v.medianHoursToDecision} hours`}.</p>
      <Group title="Disputes">
        {Object.entries(d.byStatus).map(([s, n]) =>
        <StatTile key={s} value={String(n)} label={DISPUTE_CASE_STATUS_META[s as keyof typeof d.byStatus].label} />
        )}
        <StatTile value={String(d.overdue)} label="Overdue responses" />
        <StatTile value={formatNaira(d.atStake)} label="Held in unresolved disputes" />
      </Group>
      <Group title="Moderation (waiting)">
        {Object.entries(m.pendingByTab).map(([t, n]) =>
        <StatTile key={t} value={String(n)} label={MODERATION_TAB_LABELS[t as keyof typeof m.pendingByTab]} />
        )}
      </Group>
      <ChartCard
        title="Admin actions, last 7 days"
        info={`From the audit log. ${m.removedLast7Days} removed and ${m.approvedLast7Days} approved in moderation.`}
        empty={data.actionsByAdmin.length === 0}
        csv={{ fileName: `gwani-admin-actions-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows: () => [['Staff', 'Role', 'Actions'], ...data.actionsByAdmin.map((a) => [a.name, ADMIN_ROLES[a.role as AdminRole]?.label ?? a.role, a.count])] }}>

        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="py-2">Staff</th>
              <th scope="col" className="py-2">Role</th>
              <th scope="col" className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.actionsByAdmin.map((a) =>
            <tr key={a.name}>
                <th scope="row" className="py-2 font-semibold">{a.name}</th>
                <td className="py-2 text-muted">{ADMIN_ROLES[a.role as AdminRole]?.label ?? a.role}</td>
                <td className="py-2 text-right font-mono tabular-nums">{a.count}</td>
              </tr>
            )}
          </tbody>
        </table>
      </ChartCard>
    </div>);

}
