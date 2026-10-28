import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { CHURN } from '../../analytics/config';
import { getChurnAnalytics } from '../../services/analyticsService';
import { AnalyticsSkeleton, ChartCard, InfoTip, MetricCard } from './AnalyticsParts';
import { PeriodBar } from './AnalyticsControls';
import { ChurnAtRiskList } from './AtRiskLists';
import { CHART_COLORS } from './chartUtils';
import type { ChurnType } from '../../analytics/churn';
import type { AnalyticsQuery } from '../../analytics/types';
import type { ChurnBreakdownKey } from '../../services/analyticsService';

const TYPES: {id: ChurnType;label: string;}[] = [
{ id: 'subscription', label: 'Subscription churn' },
{ id: 'activity', label: 'Activity churn' }];


const BREAKDOWNS: {id: ChurnBreakdownKey;label: string;}[] = [
{ id: 'plan', label: 'Plan' },
{ id: 'category', label: 'Trade' },
{ id: 'lga', label: 'LGA' },
{ id: 'tier', label: 'Verification' },
{ id: 'association', label: 'Trade Association' }];


/** Cohort cell colour: deeper pine for higher retention. */
function cellStyle(share: number) {
  return { backgroundColor: `rgba(31, 75, 77, ${0.08 + share / 100 * 0.85})`, color: share >= 55 ? '#fff' : '#1E1B16' };
}

const day = (iso: string) => format(new Date(iso), 'd MMM yyyy');

/** Task 107: vendor churn (subscription or activity), cohorts, breakdowns, reasons, risk and win-backs. */
export function ChurnPanel({ query, type, onTypeChange }: {query: AnalyticsQuery;type: ChurnType;onTypeChange: (type: ChurnType) => void;}) {
  const load = useCallback(() => getChurnAnalytics(query, type), [query, type]);
  const { data, status, error, reload } = useAsyncData(load);
  const [breakdown, setBreakdown] = useState<ChurnBreakdownKey>('plan');
  const file = (name: string) => `gwani-${name}-${type}-${data?.range.start.slice(0, 10)}-to-${data?.range.end.slice(0, 10)}.csv`;

  const typeBar =
  <section aria-label="Churn definition" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
      <SegmentedControl<ChurnType> label="Churn type" options={TYPES} value={type} onChange={onTypeChange} />
      <span className="flex items-center gap-1 text-sm text-muted">
        How it’s counted <InfoTip text={CHURN.definitions[type]} label="Churn definition" />
      </span>
    </section>;


  if (status === 'error' && !data) return <>{typeBar}<ErrorState message={error ?? ''} onRetry={reload} /></>;
  if (!data) return <>{typeBar}<AnalyticsSkeleton /></>;
  const s = data.summary;
  const rows = data.breakdowns[breakdown];
  const breakdownLabel = BREAKDOWNS.find((b) => b.id === breakdown)?.label ?? '';
  const maxOffset = Math.max(0, ...data.cohorts.map((c) => c.cells.length));

  return (
    <div className="space-y-4" aria-busy={status === 'loading'}>
      {typeBar}
      <PeriodBar range={data.range} previous={data.previous} compare={query.compare} generatedAt={data.generatedAt} onRefresh={reload} loading={status === 'loading'} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Churn rate" value={`${s.rate.value}%`} c={s.rate} compare={query.compare} upIsGood={false} previousText={s.rate.previous === null ? undefined : `previous: ${s.rate.previous}%`} info={data.definition} />
        <MetricCard label="Churned vendors" value={String(s.churned.value)} c={s.churned} compare={query.compare} upIsGood={false} previousText={s.churned.previous === null ? undefined : `previous: ${s.churned.previous}`} info="Vendors counted at the start of the period who churned during it (closing the account counts too)." />
        <MetricCard label="Retained vendors" value={String(s.retained.value)} c={s.retained} compare={query.compare} previousText={s.retained.previous === null ? undefined : `previous: ${s.retained.previous}`} info="Vendors counted at the start of the period who didn’t churn during it." />
        <MetricCard
          label="Average vendor lifetime"
          value={`${s.lifetimeMonths.value} mo`}
          c={s.lifetimeMonths}
          compare={query.compare}
          previousText={s.lifetimeMonths.previous === null ? undefined : `at the previous period’s end: ${s.lifetimeMonths.previous} mo`}
          info="From joining to churning for good (or leaving), or to today for vendors still here. Averaged over every vendor who has joined." />

      </div>

      <ChartCard
        title="Churn over time"
        info={`Each point is that ${data.bucketSize}’s churn rate on its own. ${data.definition}`}
        csv={{ fileName: file('churn-over-time'), rows: () => [['Period', 'Churn rate (%)', 'Churned', 'Counted at start', 'Previous period (%)'], ...data.series.map((b) => [b.label, b.rate, b.churned, b.atStart, b.previous ?? ''])] }}>

        <div className="h-[260px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" name="Churn rate" stroke={CHART_COLORS.clay} strokeWidth={2} dot={false} />
              {query.compare && <Line type="monotone" dataKey="previous" name="Previous period" stroke={CHART_COLORS.axis} strokeDasharray="5 4" strokeWidth={1.5} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>Churn rate by {data.bucketSize}</caption>
          <tbody>
            {data.series.map((b) =>
            <tr key={b.key}><th scope="row">{b.label}</th><td>{b.rate}%</td><td>{b.churned} of {b.atStart}</td></tr>
            )}
          </tbody>
        </table>
      </ChartCard>

      <ChartCard
        title="Retention by joining month"
        info={`Vendors grouped by the month they first paid. Each cell is the share still active (${type === 'subscription' ? 'subscribed' : `a completed job or order in the last ${data.inactiveDays} days`}) at the end of that many months later. The last ${CHURN.cohortMonths} joining months; doesn’t follow the date range.`}
        empty={data.cohorts.every((c) => c.size === 0)}
        emptyText="No vendors joined in the last 12 months."
        csv={{
          fileName: `gwani-retention-cohorts-${type}.csv`,
          rows: () => [['Joined', 'Vendors', ...Array.from({ length: maxOffset }, (_, i) => `Month ${i} (%)`)], ...data.cohorts.map((c) => [c.label, c.size, ...c.cells.map((x) => x.share ?? '')])]
        }}>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0.5 text-xs">
            <caption className="sr-only">Share of each joining month’s vendors still active, by months since joining</caption>
            <thead className="font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="py-1 pr-2 text-left">Joined</th>
                <th scope="col" className="py-1 pr-2 text-right">Vendors</th>
                {Array.from({ length: maxOffset }, (_, i) =>
                <th key={i} scope="col" className="py-1 text-center">M{i}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) =>
              <tr key={c.cohort}>
                  <th scope="row" className="whitespace-nowrap py-1 pr-2 text-left font-semibold">{c.label}</th>
                  <td className="py-1 pr-2 text-right font-mono tabular-nums">{c.size}</td>
                  {Array.from({ length: maxOffset }, (_, i) => {
                  const cell = c.cells[i];
                  if (!cell) return <td key={i} />;
                  if (cell.share === null) return <td key={i} className="rounded bg-sand/60 py-1.5 text-center text-muted">–</td>;
                  return <td key={i} className="rounded py-1.5 text-center font-semibold tabular-nums" style={cellStyle(cell.share)}>{Math.round(cell.share)}%</td>;
                })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title={`Churn by ${breakdownLabel.toLowerCase()}`}
          info="Vendors counted at the start of the period in each group, and how many of them churned. Plan is the plan they were on at the start."
          empty={rows.length === 0}
          csv={{ fileName: file(`churn-by-${breakdown}`), rows: () => [[breakdownLabel, 'Counted at start', 'Churned', 'Churn rate (%)'], ...rows.map((r) => [r.group, r.atStart, r.churned, r.rate])] }}>

          <div className="mb-3 overflow-x-auto">
            <SegmentedControl<ChurnBreakdownKey> label="Break down by" options={BREAKDOWNS} value={breakdown} onChange={setBreakdown} />
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">Churn by {breakdownLabel}</caption>
            <thead className="text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="py-1.5 text-left">{breakdownLabel}</th>
                <th scope="col" className="py-1.5 text-right">At start</th>
                <th scope="col" className="py-1.5 text-right">Churned</th>
                <th scope="col" className="w-2/5 py-1.5 pl-3 text-left">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) =>
              <tr key={r.group}>
                  <th scope="row" className="py-1.5 pr-2 text-left font-semibold">{r.group}</th>
                  <td className="py-1.5 text-right font-mono tabular-nums">{r.atStart}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{r.churned}</td>
                  <td className="py-1.5 pl-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2 flex-1 rounded-full bg-sand"><span className="block h-2 rounded-full bg-clay" style={{ width: `${r.rate}%` }} /></span>
                      <span className="w-12 text-right font-mono text-xs tabular-nums">{r.rate}%</span>
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ChartCard>

        <ChartCard
          title="Why vendors left"
          info="Answers from the cancel-subscription dialog and the exit survey given in the period, most common first. Not every vendor answers."
          empty={data.reasons.length === 0}
          emptyText="No cancel or exit-survey answers in this period."
          csv={{ fileName: file('churn-reasons'), rows: () => [['Reason', 'Answers', 'Share (%)', 'Comments'], ...data.reasons.map((r) => [r.label, r.count, r.share, r.comments.join(' | ')])] }}>

          <ol className="space-y-3">
            {data.reasons.map((r, i) =>
            <li key={r.reason}>
                <p className="flex items-baseline gap-2 text-sm">
                  <span className="w-5 font-mono text-muted">{i + 1}.</span>
                  <span className="flex-1 font-semibold">{r.label}</span>
                  <span className="font-mono tabular-nums">{r.count}</span>
                  <span className="w-12 text-right font-mono text-xs tabular-nums text-muted">{r.share}%</span>
                </p>
                <span className="ml-7 mt-1 block h-1.5 rounded-full bg-sand"><span className="block h-1.5 rounded-full bg-mustard" style={{ width: `${r.share}%` }} /></span>
                {r.comments.length > 0 && <p className="ml-7 mt-1 text-xs italic text-muted">“{r.comments[0]}”{r.comments.length > 1 && ` +${r.comments.length - 1} more`}</p>}
              </li>
            )}
          </ol>
        </ChartCard>
      </div>

      <ChartCard
        title={`At risk of churning: ${data.atRisk.length} vendor${data.atRisk.length === 1 ? '' : 's'}`}
        info={`Current vendors in the grace period, with completed work down by half or more over the last ${CHURN.risk.activityWindowDays} days, or whose latest ${CHURN.risk.recentReviews} reviews average ${CHURN.risk.ratingDropBy}★ or more below their earlier ones. As of today; doesn’t follow the date range. Messages go to the vendor as a notification; flags are internal. Both are written to the audit log.`}
        empty={data.atRisk.length === 0}
        emptyText="No vendors show signs of churning right now."
        csv={{ fileName: 'gwani-churn-at-risk.csv', rows: () => [['Vendor', 'Trade', 'LGA', 'Plan', 'Reasons'], ...data.atRisk.map((r) => [r.name, r.categoryLabel, r.lga, r.planLabel, r.signals.map((x) => x.text).join('; ')])] }}>

        <ChurnAtRiskList rows={data.atRisk} />
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ChartCard
          title="Win-backs"
          info={type === 'subscription' ? 'Vendors who paid again in the period after their subscription had lapsed.' : `Vendors who completed work again in the period after ${data.inactiveDays} days or more without any.`}
          empty={data.winBacks.length === 0}
          emptyText="No vendors came back in this period."
          csv={{ fileName: file('win-backs'), rows: () => [['Vendor', 'Churned', 'Returned', 'Days away'], ...data.winBacks.map((w) => [w.name, w.churnedAt.slice(0, 10), w.returnedAt.slice(0, 10), w.daysAway])] }}>

          <ul className="divide-y divide-line text-sm">
            {data.winBacks.map((w) =>
            <li key={`${w.vendorId}-${w.returnedAt}`} className="py-1.5">
                <span className="font-semibold">{w.name}</span>
                <p className="text-xs text-muted">Back {day(w.returnedAt)} after {w.daysAway} days away</p>
              </li>
            )}
          </ul>
        </ChartCard>

        <ChartCard
          title={`Churned vendors: ${data.churned.length}`}
          info="Each churn in the period by a vendor counted at its start, with their plan just before, and the reason they gave if any."
          empty={data.churned.length === 0}
          emptyText="No vendors churned in this period."
          csv={{
            fileName: file('churned-vendors'),
            rows: () => [
            ['Vendor', 'Trade', 'LGA', 'Plan', 'Verification', 'Trade Association', 'Churned on', 'Came back on', 'Reason', 'Comment'],
            ...data.churned.map((c) => [c.name, c.categoryLabel, c.lga, c.planLabel, c.tierLabel, c.association, c.churnedAt.slice(0, 10), c.returnedAt?.slice(0, 10) ?? '', c.reason ?? '', c.comment ?? ''])]

          }}>

          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[600px] text-sm">
              <caption className="sr-only">Vendors who churned in the period</caption>
              <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="py-1.5 text-left">Vendor</th>
                  <th scope="col" className="py-1.5 text-left">Plan</th>
                  <th scope="col" className="py-1.5 text-left">Churned</th>
                  <th scope="col" className="py-1.5 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.churned.map((c) =>
                <tr key={`${c.vendorId}-${c.churnedAt}`} className="align-top">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                      <span className="font-semibold">{c.name}</span>
                      <p className="text-xs text-muted">{c.categoryLabel} · {c.lga} · {c.tierLabel}</p>
                    </th>
                    <td className="py-1.5 pr-2">{c.planLabel}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {day(c.churnedAt)}
                      {c.returnedAt && <p className="text-xs text-pine">back {day(c.returnedAt)}</p>}
                    </td>
                    <td className="py-1.5">{c.reason ?? <span className="text-muted">Not given</span>}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>);

}
