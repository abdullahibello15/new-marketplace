import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { AREA_MODE, SEARCH_ROUTE } from '../../../discovery/constants';
import { DEFAULT_FILTERS, filtersToSearchString } from '../../../discovery/utils/searchFilters';
import { getVendorAnalytics } from '../../services/analyticsService';
import { AnalyticsSkeleton, ChartCard, Delta, MetricCard } from './AnalyticsParts';
import { CHART_COLORS } from './chartUtils';
import { PeriodBar } from './AnalyticsControls';
import type { BusinessKind, AnalyticsQuery } from '../../analytics/types';
import type { NigerLga, TradeCategory } from '../../../../types/marketplace';

/** The customer search, filtered to one trade and one LGA (the same filter the search page offers). */
const searchLink = (category: TradeCategory, lga: NigerLga) =>
`${SEARCH_ROUTE}${filtersToSearchString({ ...DEFAULT_FILTERS, categories: [category], area: { mode: AREA_MODE.Lga, lgas: [lga] } })}`;

/** Task 103: active vendors by category and LGA, for service or retail vendors. */
export function VendorsPanel({ query, onKindChange }: {query: AnalyticsQuery;onKindChange: (kind: BusinessKind) => void;}) {
  const load = useCallback(() => getVendorAnalytics(query), [query]);
  const { data, status, error, reload } = useAsyncData(load);
  const file = (name: string) => `gwani-${name}-${query.kind}-${data?.range.start.slice(0, 10)}-to-${data?.range.end.slice(0, 10)}.csv`;

  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <AnalyticsSkeleton />;
  const s = data.summary;
  const maxCell = Math.max(1, ...data.matrix.rows.flatMap((r) => r.cells.map((c) => c.count)));
  const noVendors = s.active.value === 0;

  return (
    <div className="space-y-4" aria-busy={status === 'loading'}>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<BusinessKind>
          label="Vendor type"
          options={[{ id: 'service', label: 'Service vendors' }, { id: 'retail', label: 'Retail vendors' }]}
          value={query.kind}
          onChange={onKindChange} />

        <div className="min-w-0 flex-1">
          <PeriodBar range={data.range} previous={data.previous} compare={query.compare} generatedAt={data.generatedAt} onRefresh={reload} loading={status === 'loading'} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active vendors" value={String(s.active.value)} c={s.active} compare={query.compare} previousText={`previous: ${s.active.previous}`} info={data.definition} />
        <MetricCard label="New vendors" value={String(s.newVendors.value)} c={s.newVendors} compare={query.compare} previousText={`previous: ${s.newVendors.previous}`} info="Vendors whose first subscription payment fell in the period." />
        <MetricCard
          label="Suspended vendors"
          value={String(s.suspended.value)}
          c={s.suspended}
          compare={query.compare}
          upIsGood={false}
          previousText={`previous: ${s.suspended.previous}`}
          info="Vendors suspended at the end of the period: a subscription lapsed past its grace period, or suspended by Gwani. All vendor types." />

        <MetricCard
          label="Verified share"
          value={`${s.verifiedShare.value}%`}
          c={s.verifiedShare}
          compare={query.compare}
          previousText={`previous: ${s.verifiedShare.previous}%`}
          info="Active vendors who are ID-Verified or Trade-Verified (current badge)." />

      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard
          title="Active vendors by trade"
          info={data.definition}
          empty={noVendors}
          csv={{ fileName: file('active-vendors-by-trade'), rows: () => [['Trade', 'Active vendors', 'Previous period'], ...data.byCategory.map((r) => [r.label, r.count, r.previous])] }}>

          <div className="h-[280px]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byCategory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                {query.compare && <Legend wrapperStyle={{ fontSize: 12 }} />}
                <Bar dataKey="count" name="This period" fill={CHART_COLORS.pine} radius={[4, 4, 0, 0]} />
                {query.compare && <Bar dataKey="previous" name="Previous period" fill={CHART_COLORS.mustard} radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Active vendors by trade</caption>
            <tbody>
              {data.byCategory.map((r) =>
              <tr key={r.category}><th scope="row">{r.label}</th><td>{r.count}</td></tr>
              )}
            </tbody>
          </table>
        </ChartCard>

        <ChartCard
          title="By LGA (all 25 in Niger State)"
          info="Active vendors serving each LGA: a vendor serving three LGAs counts in each."
          csv={{ fileName: file('active-vendors-by-lga'), rows: () => [['LGA', 'Active vendors', 'Previous period', 'Change %'], ...data.byLga.map((r) => [r.lga, r.count, r.previous, r.change ?? ''])] }}>

          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="py-2 text-left">LGA</th>
                  <th scope="col" className="py-2 text-right">Active</th>
                  <th scope="col" className="py-2 text-right">Previous</th>
                  <th scope="col" className="py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.byLga.map((r) =>
                <tr key={r.lga} className={r.count === 0 ? 'text-muted' : ''}>
                    <th scope="row" className="py-1.5 text-left font-semibold">{r.lga}</th>
                    <td className="py-1.5 text-right font-mono tabular-nums">{r.count}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{r.previous}</td>
                    <td className="py-1.5 text-right">
                      <Delta c={{ value: r.count, previous: r.previous, change: r.change }} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Coverage: trade × LGA"
        info="Active vendors per trade and LGA. Empty cells are gaps, e.g. an LGA with no electricians. Each cell opens the customer search filtered to that trade and LGA."
        csv={{
          fileName: file('trade-by-lga'),
          rows: () => [['LGA', ...data.matrix.categories.map((c) => c.label)], ...data.matrix.lgas.map((lga, i) => [lga, ...data.matrix.rows.map((r) => r.cells[i].count)])]
        }}>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0.5 text-xs">
            <caption className="sr-only">Active vendors by trade (columns) and LGA (rows). Each cell links to the customer search.</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-white px-2 py-1 text-left text-muted">LGA</th>
                {data.matrix.categories.map((c) =>
                <th key={c.id} scope="col" className="px-1 py-1 text-center font-bold text-muted">{c.label}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.matrix.lgas.map((lga, i) =>
              <tr key={lga}>
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-white px-2 py-1 text-left font-semibold">{lga}</th>
                  {data.matrix.rows.map((row) => {
                  const count = row.cells[i].count;
                  const label = data.matrix.categories.find((c) => c.id === row.category)?.label ?? row.category;
                  const intensity = count / maxCell;
                  return (
                    <td key={row.category} className="p-0">
                        <Link
                        to={searchLink(row.category, lga)}
                        aria-label={`${count} active ${label.toLowerCase()} vendors serving ${lga}. Open the vendor list.`}
                        style={count ? { backgroundColor: `rgba(31, 75, 77, ${0.12 + intensity * 0.78})` } : undefined}
                        className={`block rounded px-1 py-1.5 text-center font-mono font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/50 ${
                        count === 0 ? 'bg-clay-soft text-clay-dark hover:bg-clay/20' : intensity > 0.5 ? 'text-white hover:opacity-90' : 'text-ink hover:opacity-90'}`}>

                          {count || '–'}
                        </Link>
                      </td>);

                })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Red cells are gaps: no active vendor of that trade serves the LGA.</p>
      </ChartCard>
    </div>);

}
