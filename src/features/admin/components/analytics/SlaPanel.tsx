import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { SLA_RULES } from '../../analytics/slaConfig';
import { getSlaAnalytics } from '../../services/analyticsService';
import { AnalyticsSkeleton, ChartCard, InfoTip, MetricCard } from './AnalyticsParts';
import { PeriodBar } from './AnalyticsControls';
import { SlaAtRiskList } from './AtRiskLists';
import { CHART_COLORS, formatMinutes } from './chartUtils';
import { VendorSlaHistory } from './VendorSlaHistory';
import type { AnalyticsQueryChanges } from '../../hooks/useAnalyticsQuery';
import type { AnalyticsQuery, SlaFilters } from '../../analytics/types';
import type { SlaGroupRow } from '../../services/analyticsService';

interface SlaPanelProps {
  query: AnalyticsQuery;
  filters: SlaFilters;
  search: string;
  vendor: string | null;
  onChange: (changes: Partial<AnalyticsQueryChanges>) => void;
}

const select = `${field} ${ok} py-2`;
const COMPLIANCE_INFO = 'Requests answered by their deadline ÷ requests that were answered or are overdue. Requests not due yet aren’t counted. The clock runs only in each vendor’s working hours, and not on their blocked days.';

function ResponseBars({ rows, keyLabel }: {rows: SlaGroupRow[];keyLabel: string;}) {
  return (
    <>
      <div className="h-[260px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={56} />
            <YAxis tickFormatter={(v: number) => formatMinutes(v)} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip formatter={(v: number) => formatMinutes(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="median" name="Median" fill={CHART_COLORS.pine} />
            <Bar dataKey="p90" name="90th percentile" fill={CHART_COLORS.mustard} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Response time by {keyLabel}</caption>
        <tbody>
          {rows.map((r) =>
          <tr key={r.key}><th scope="row">{r.label}</th><td>Median {formatMinutes(r.median)}</td><td>90th percentile {formatMinutes(r.p90)}</td><td>{r.count} requests</td></tr>
          )}
        </tbody>
      </table>
    </>);

}

function Trend({ points }: {points: number | null;}) {
  if (points === null) return <span className="text-xs text-muted">—</span>;
  if (points === 0) return <span className="text-xs font-semibold text-muted">no change</span>;
  const Icon = points > 0 ? TrendingUpIcon : TrendingDownIcon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${points > 0 ? 'text-pine' : 'text-clay-dark'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {points > 0 ? '+' : ''}
      {points} pts
    </span>);

}

/** Task 106: response-time SLA compliance, by trade, LGA and vendor, with the vendors at risk. */
export function SlaPanel({ query, filters, search, vendor, onChange }: SlaPanelProps) {
  const load = useCallback(() => getSlaAnalytics(query, filters), [query, filters]);
  const { data, status, error, reload } = useAsyncData(load);
  const file = (name: string) => `gwani-${name}-${data?.range.start.slice(0, 10)}-to-${data?.range.end.slice(0, 10)}.csv`;
  const vendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.vendors ?? []).filter((v) => !q || v.name.toLowerCase().includes(q));
  }, [data, search]);
  const filtered = filters.slaType !== 'all' || filters.category !== 'all' || filters.lga !== 'all' || filters.plan !== 'all';

  const filterBar =
  <section aria-label="SLA filters" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-3">
      <div>
        <label htmlFor="sla-type" className={labelClass}>SLA</label>
        <select id="sla-type" value={filters.slaType} onChange={(e) => onChange({ sla: { slaType: e.target.value as SlaFilters['slaType'] } })} className={select}>
          <option value="all">All response types</option>
          {data?.rules.map((r) => <option key={r.type} value={r.type}>{r.label}</option>) ??
        Object.entries(SLA_RULES).map(([type, r]) => <option key={type} value={type}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="sla-cat" className={labelClass}>Trade</label>
        <select id="sla-cat" value={filters.category} onChange={(e) => onChange({ sla: { category: e.target.value as SlaFilters['category'] } })} className={select}>
          <option value="all">All trades</option>
          {data?.options.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="sla-lga" className={labelClass}>LGA</label>
        <select id="sla-lga" value={filters.lga} onChange={(e) => onChange({ sla: { lga: e.target.value as SlaFilters['lga'] } })} className={select}>
          <option value="all">All LGAs</option>
          {data?.options.lgas.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="sla-plan" className={labelClass}>Plan</label>
        <select id="sla-plan" value={filters.plan} onChange={(e) => onChange({ sla: { plan: e.target.value as SlaFilters['plan'] } })} className={select}>
          <option value="all">All plans</option>
          {data?.options.plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      {filtered &&
    <Button variant="ghost" size="sm" onClick={() => onChange({ sla: { slaType: 'all', category: 'all', lga: 'all', plan: 'all' } })}>
          Clear filters
        </Button>
    }
    </section>;


  if (status === 'error' && !data) return <>{filterBar}<ErrorState message={error ?? ''} onRetry={reload} /></>;
  if (!data) return <>{filterBar}<AnalyticsSkeleton /></>;
  const s = data.summary;
  const empty = s.responses.value === 0;
  const periodText = `${format(new Date(data.range.start), 'd MMM')} – ${format(new Date(data.range.end), 'd MMM yyyy')}`;
  const openName = data.vendors.find((v) => v.vendorId === vendor)?.name ?? 'Vendor';

  return (
    <div className="space-y-4" aria-busy={status === 'loading'}>
      {filterBar}
      <PeriodBar range={data.range} previous={data.previous} compare={query.compare} generatedAt={data.generatedAt} onRefresh={reload} loading={status === 'loading'} />

      <details className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
        <summary className="cursor-pointer font-bold">SLA targets <span className="ml-1 font-normal text-muted">(placeholder values, to confirm against the build spec)</span></summary>
        <ul className="mt-2 grid gap-2 md:grid-cols-2">
          {data.rules.map((r) =>
          <li key={r.type} className="rounded-xl bg-sand px-3 py-2">
              <p className="font-semibold">{r.label}: {formatMinutes(r.withinHoursMinutes)} of working time</p>
              <p className="text-xs text-muted">{r.description} Outside working hours: {formatMinutes(r.afterHoursWallClockMinutes)}, or {formatMinutes(r.withinHoursMinutes)} after the vendor next opens if that’s later.</p>
            </li>
          )}
        </ul>
        <p className="mt-2 text-xs text-muted">At risk: {data.repeatBreachThreshold} or more breaches in the period.</p>
      </details>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Compliance" value={empty ? '—' : `${s.compliance.value}%`} c={s.compliance} compare={query.compare} previousText={s.compliance.previous === null ? undefined : `previous: ${s.compliance.previous}%`} info={COMPLIANCE_INFO} />
        <MetricCard label="Median response" value={formatMinutes(s.median.value)} c={s.median} compare={query.compare} upIsGood={false} previousText={s.median.previous === null ? undefined : `previous: ${formatMinutes(s.median.previous)}`} info="Half of the answered requests were answered faster than this (working time)." />
        <MetricCard label="90th percentile" value={formatMinutes(s.p90.value)} c={s.p90} compare={query.compare} upIsGood={false} previousText={s.p90.previous === null ? undefined : `previous: ${formatMinutes(s.p90.previous)}`} info="9 in 10 answered requests were answered faster than this (working time)." />
        <MetricCard label="Breaches" value={String(s.breaches.value)} c={s.breaches} compare={query.compare} upIsGood={false} previousText={s.breaches.previous === null ? undefined : `previous: ${s.breaches.previous}`} info={`Requests answered after their deadline, or still unanswered past it. Out of ${s.responses.value} requests in the period.`} />
      </div>

      <ChartCard
        title="Compliance over time"
        info={COMPLIANCE_INFO}
        empty={empty}
        csv={{ fileName: file('sla-compliance-over-time'), rows: () => [['Period', 'Compliance (%)', 'Previous period (%)', 'Breaches'], ...data.series.map((b) => [b.label, b.compliance ?? '', b.previous ?? '', b.breaches])] }}>

        <div className="h-[260px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="compliance" name="Compliance" stroke={CHART_COLORS.pine} strokeWidth={2} dot={false} connectNulls />
              {query.compare && <Line type="monotone" dataKey="previous" name="Previous period" stroke={CHART_COLORS.axis} strokeDasharray="5 4" strokeWidth={1.5} dot={false} connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>Compliance by {data.bucketSize}</caption>
          <tbody>
            {data.series.map((b) =>
            <tr key={b.key}><th scope="row">{b.label}</th><td>{b.compliance === null ? 'no requests due' : `${b.compliance}%`}</td><td>{b.breaches} breaches</td></tr>
            )}
          </tbody>
        </table>
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Response time by trade" empty={empty} csv={{ fileName: file('sla-by-trade'), rows: () => [['Trade', 'Median (working min)', '90th percentile (working min)', 'Compliance (%)', 'Requests'], ...data.byCategory.map((r) => [r.label, r.median ?? '', r.p90 ?? '', r.compliance ?? '', r.count])] }}>
          <ResponseBars rows={data.byCategory} keyLabel="trade" />
        </ChartCard>
        <ChartCard
          title="Response time by LGA"
          info="Where the work was: the job address or delivery area."
          empty={empty}
          csv={{ fileName: file('sla-by-lga'), rows: () => [['LGA', 'Median (working min)', '90th percentile (working min)', 'Compliance (%)', 'Requests'], ...data.byLga.map((r) => [r.label, r.median ?? '', r.p90 ?? '', r.compliance ?? '', r.count])] }}>

          <ResponseBars rows={data.byLga} keyLabel="LGA" />
        </ChartCard>
      </div>

      <ChartCard
        title={`At risk: ${data.atRisk.length} vendor${data.atRisk.length === 1 ? '' : 's'} with repeated breaches`}
        info={`Current vendors with ${data.repeatBreachThreshold} or more breaches in the period. Reminders go to the vendor as a notification; flags are internal. Both are written to the audit log.`}
        empty={data.atRisk.length === 0}
        emptyText="No vendor breached repeatedly in this period."
        csv={{ fileName: file('sla-at-risk'), rows: () => [['Vendor', 'Trade', 'LGA', 'Breaches', 'Requests', 'Compliance (%)', 'Median (working min)', 'Last breach'], ...data.atRisk.map((r) => [r.name, r.categoryLabel, r.lga, r.breaches, r.responses, r.compliance ?? '', r.medianMinutes ?? '', r.lastBreachAt?.slice(0, 10) ?? ''])] }}>

        <SlaAtRiskList rows={data.atRisk} periodText={periodText} onOpenVendor={(id) => onChange({ vendor: id })} />
      </ChartCard>

      <ChartCard
        title="Vendors by compliance"
        info="Every vendor with requests in the period, best compliance first. Trend is the change in compliance (percentage points) vs the previous period. Select a vendor to see the requests that breached."
        empty={data.vendors.length === 0}
        csv={{
          fileName: file('sla-vendors'),
          rows: () => [
          ['Rank', 'Vendor', 'Trade', 'LGA', 'Plan', 'Compliance (%)', 'Average response (working min)', 'Median (working min)', 'Breaches', 'Requests', 'Trend (pts)'],
          ...vendors.map((v) => [data.vendors.indexOf(v) + 1, v.name, v.categoryLabel, v.lga, v.planLabel, v.compliance ?? '', v.averageMinutes ?? '', v.medianMinutes ?? '', v.breaches, v.responses, v.trend ?? ''])]

        }}>

        <div className="mb-3 max-w-sm">
          <SearchInput label="Search vendors by name" value={search} onChange={(v) => onChange({ search: v })} />
        </div>
        {vendors.length === 0 ?
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No vendor matches “{search}”.</p> :

        <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Vendors ranked by SLA compliance</caption>
              <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="py-1.5 text-left">#</th>
                  <th scope="col" className="py-1.5 text-left">Vendor</th>
                  <th scope="col" className="py-1.5 text-left">Plan</th>
                  <th scope="col" className="py-1.5 text-right">Compliance</th>
                  <th scope="col" className="py-1.5 text-right">Avg response</th>
                  <th scope="col" className="py-1.5 text-right">Breaches</th>
                  <th scope="col" className="py-1.5 text-right">
                    <span className="inline-flex items-center gap-1">Trend <InfoTip text="Change in compliance vs the previous period, in percentage points." label="About trend" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vendors.map((v) =>
              <tr key={v.vendorId}>
                    <td className="py-1.5 pr-2 font-mono tabular-nums text-muted">{data.vendors.indexOf(v) + 1}</td>
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                      <button type="button" onClick={() => onChange({ vendor: v.vendorId })} className="font-semibold text-pine underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                        {v.name}
                      </button>
                      <p className="text-xs text-muted">{v.categoryLabel} · {v.lga}{!v.current && ' · account closed'}</p>
                    </th>
                    <td className="py-1.5 pr-2">{v.planLabel}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{v.compliance === null ? '—' : `${v.compliance}%`}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{formatMinutes(v.averageMinutes)}</td>
                    <td className={`py-1.5 text-right font-mono tabular-nums ${v.breaches >= data.repeatBreachThreshold ? 'font-bold text-clay-dark' : ''}`}>{v.breaches}</td>
                    <td className="py-1.5 text-right"><Trend points={v.trend} /></td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </ChartCard>

      <VendorSlaHistory vendorId={vendor} vendorName={openName} query={query} onClose={() => onChange({ vendor: null })} />
    </div>);

}
