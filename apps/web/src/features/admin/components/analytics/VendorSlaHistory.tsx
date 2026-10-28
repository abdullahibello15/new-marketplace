import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { XIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { getVendorSlaHistory } from '../../services/analyticsService';
import { ExportCsvButton } from './AnalyticsParts';
import { formatMinutes } from './chartUtils';
import type { AnalyticsQuery } from '../../analytics/types';
import type { SlaVerdict } from '../../analytics/sla';

const VERDICT: Record<SlaVerdict, {label: string;tone: 'success' | 'danger' | 'neutral';}> = {
  met: { label: 'Met', tone: 'success' },
  breached: { label: 'Breached', tone: 'danger' },
  pending: { label: 'Waiting', tone: 'neutral' }
};

type Show = 'breached' | 'all';
const when = (iso: string) => format(new Date(iso), 'd MMM, HH:mm');

function HistoryBody({ vendorId, query }: {vendorId: string;query: AnalyticsQuery;}) {
  const load = useCallback(() => getVendorSlaHistory(vendorId, query), [vendorId, query]);
  const { data, status, error, reload } = useAsyncData(load);
  const [show, setShow] = useState<Show>('breached');
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => show === 'all' || r.verdict === 'breached'), [data, show]);

  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <div role="status" aria-live="polite" className="h-64 animate-pulse rounded-xl bg-sand"><span className="sr-only">Loading response history…</span></div>;
  const s = data.summary;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {data.vendor.categoryLabel} · {data.vendor.lga}
        {!data.vendor.current && ' · account closed'} · {format(new Date(data.range.start), 'd MMM yyyy')} – {format(new Date(data.range.end), 'd MMM yyyy')}
      </p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
        ['Compliance', s.compliance === null ? '—' : `${s.compliance}%`],
        ['Breaches', `${s.breached} of ${s.met + s.breached}`],
        ['Median reply', formatMinutes(s.median)],
        ['90th percentile', formatMinutes(s.p90)]].
        map(([label, value]) =>
        <div key={label} className="rounded-xl bg-sand px-3 py-2">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className="text-lg font-extrabold">{value}</dd>
          </div>
        )}
      </dl>
      {data.byType.length > 1 &&
      <ul className="flex flex-wrap gap-2 text-xs">
          {data.byType.map((t) =>
        <li key={t.type} className="rounded-full border border-line px-2.5 py-1">
              {t.label}: <strong>{t.stats.compliance === null ? '—' : `${t.stats.compliance}%`}</strong> ({t.stats.breached} breached)
            </li>
        )}
        </ul>
      }
      {data.outreach.length > 0 &&
      <p className="text-xs text-muted">Outreach: {data.outreach.map((m) => `${m.label} (${format(new Date(m.at), 'd MMM')}, ${m.by})`).join(' · ')}</p>
      }

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<Show> label="Show" options={[{ id: 'breached', label: `Breaches (${s.breached})` }, { id: 'all', label: `All requests (${s.total})` }]} value={show} onChange={setShow} />
        <span className="flex-1" />
        <ExportCsvButton
          label="response history"
          fileName={`gwani-sla-history-${data.vendor.id}-${data.range.start.slice(0, 10)}-to-${data.range.end.slice(0, 10)}.csv`}
          rows={() => [
          ['Requested', 'Type', 'Request', 'LGA', 'Due by', 'Responded', 'Working minutes to respond', 'Working minutes late', 'Result'],
          ...rows.map((r) => [r.requestedAt, r.typeLabel, r.label, r.lga, r.deadline, r.respondedAt ?? '', r.responseMinutes ?? '', r.lateMinutes, VERDICT[r.verdict].label])]
          } />

      </div>

      {rows.length === 0 ?
      <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{show === 'breached' ? 'No breaches in this period.' : 'No requests in this period.'}</p> :

      <div className="max-h-[50dvh] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Requests and responses</caption>
            <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="py-1.5 text-left">Request</th>
                <th scope="col" className="py-1.5 text-left">Received</th>
                <th scope="col" className="py-1.5 text-left">Due by</th>
                <th scope="col" className="py-1.5 text-left">Responded</th>
                <th scope="col" className="py-1.5 text-right">Took</th>
                <th scope="col" className="py-1.5 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) =>
            <tr key={r.id}>
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                    <span className="font-semibold">{r.typeLabel}</span>
                    <p className="text-xs text-muted">{r.label} · {r.lga}</p>
                  </th>
                  <td className="py-1.5 pr-2 tabular-nums">{when(r.requestedAt)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{when(r.deadline)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.respondedAt ? when(r.respondedAt) : <span className="text-muted">No reply</span>}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatMinutes(r.responseMinutes)}
                    {r.lateMinutes > 0 && <p className="text-xs text-clay-dark">{formatMinutes(r.lateMinutes)} late</p>}
                  </td>
                  <td className="py-1.5 text-right"><Badge tone={VERDICT[r.verdict].tone}>{VERDICT[r.verdict].label}</Badge></td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      }
      <p className="text-xs text-muted">Times to respond are working time: the clock pauses outside the vendor’s working hours and on their blocked days.</p>
    </div>);

}

/** A vendor's response history for the period, opened from the SLA table (?vendor= in the URL). */
export function VendorSlaHistory({ vendorId, vendorName, query, onClose }: {vendorId: string | null;vendorName: string;query: AnalyticsQuery;onClose: () => void;}) {
  return (
    <Dialog open={!!vendorId} onClose={onClose} variant="sheet" title={`${vendorName}: response history`}>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" icon={XIcon} onClick={onClose}>Close</Button>
      </div>
      {vendorId && <HistoryBody vendorId={vendorId} query={query} />}
    </Dialog>);

}
