import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ScrollTextIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SearchInput } from '../../../components/ui/SearchInput';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ADMIN_ROLES } from '../config/roles';
import { AUDIT_ACTION_LABELS } from '../constants';
import { mockStaff } from '../mock/staff';
import { listAuditLog } from '../services/auditService';

const AREAS = [
{ id: 'all', label: 'All areas' },
{ id: 'verification', label: 'Verification' },
{ id: 'dispute', label: 'Disputes' },
{ id: 'moderation', label: 'Moderation' },
{ id: 'vendor', label: 'Vendor outreach' },
{ id: 'bulk', label: 'Bulk tools' }] as
const;

const select = `${field} ${ok} py-2.5`;

/** /admin/audit — every admin action: who, what, which item, why and when. Read-only. */
export function AuditLogSection() {
  const { data, status, error, reload } = useAsyncData(listAuditLog);
  const [area, setArea] = useState<(typeof AREAS)[number]['id']>('all');
  const [actor, setActor] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (e) =>
      (area === 'all' || e.action.startsWith(area)) && (
      actor === 'all' || e.actor.id === actor) && (
      !q || [e.target.label, e.target.id, e.reason ?? '', e.details ?? ''].some((s) => s.toLowerCase().includes(q)))
    );
  }, [data, area, actor, query]);

  function renderBody() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading the audit log" rows={6} rowClassName="h-14" />;
    if (rows.length === 0) {
      return data.length === 0 ?
      <EmptyState icon={ScrollTextIcon} title="No admin actions yet" /> :

      <EmptyState
        icon={SearchXIcon}
        title="No entries match"
        action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setArea('all');
            setActor('all');
            setQuery('');
          }}>

                Clear filters
              </Button>
        } />;


    }
    return (
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Admin audit log, newest first. Read-only.</caption>
          <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">When</th>
              <th scope="col" className="px-4 py-3">Who</th>
              <th scope="col" className="px-4 py-3">What</th>
              <th scope="col" className="px-4 py-3">Target</th>
              <th scope="col" className="px-4 py-3">Reason and details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {rows.map((e) =>
            <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  <time dateTime={e.at}>{format(new Date(e.at), 'd MMM yyyy, h:mm a')}</time>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{e.actor.name}</p>
                  <p className="text-xs text-muted">{ADMIN_ROLES[e.actor.role].label}</p>
                </td>
                <td className="px-4 py-3 font-semibold">{AUDIT_ACTION_LABELS[e.action]}</td>
                <td className="px-4 py-3">
                  <p>{e.target.label}</p>
                  <p className="font-mono text-xs text-muted">{e.target.id}</p>
                </td>
                <td className="px-4 py-3">
                  {e.reason && <p>{e.reason}</p>}
                  {e.details && <p className="text-xs text-muted">{e.details}</p>}
                  {!e.reason && !e.details && <span className="text-muted">—</span>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>);

  }

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every admin action, newest first. Read-only." />
      <PageContainer className="space-y-4">
        <section aria-label="Filter the audit log" className="grid gap-3 sm:grid-cols-[1fr_200px_220px] sm:items-end">
          <SearchInput value={query} onChange={setQuery} label="Search target, reason or details" />
          <div>
            <label htmlFor="audit-area" className={labelClass}>Area</label>
            <select id="audit-area" className={select} value={area} onChange={(e) => setArea(e.target.value as typeof area)}>
              {AREAS.map((a) =>
              <option key={a.id} value={a.id}>{a.label}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="audit-actor" className={labelClass}>Staff</label>
            <select id="audit-actor" className={select} value={actor} onChange={(e) => setActor(e.target.value)}>
              <option value="all">Everyone</option>
              {mockStaff.map((s) =>
              <option key={s.id} value={s.id}>{s.name}</option>
              )}
            </select>
          </div>
        </section>
        {renderBody()}
      </PageContainer>
    </>);

}
