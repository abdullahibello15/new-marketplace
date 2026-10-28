import { useCallback } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { formatNaira } from '../../../../utils/format';
import { getGmvAnalytics } from '../../services/analyticsService';
import { AnalyticsSkeleton, ChartCard, Delta, MetricCard } from './AnalyticsParts';
import { CHART_COLORS, compactNaira } from './chartUtils';
import { PeriodBar } from './AnalyticsControls';
import type { AnalyticsQuery } from '../../analytics/types';

const BUCKET_WORD = { day: 'daily', week: 'weekly', month: 'monthly' } as const;
const share = (part: number, total: number) => total ? `${Math.round(part / total * 1000) / 10}%` : '0%';

function BreakdownTable({ rows, keyLabel, total }: {rows: {key: string;label?: string;gmv: number;count: number;}[];keyLabel: string;total: number;}) {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="py-2 text-left">{keyLabel}</th>
            <th scope="col" className="py-2 text-right">GMV</th>
            <th scope="col" className="py-2 text-right">Completed</th>
            <th scope="col" className="py-2 text-right">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) =>
          <tr key={r.key}>
              <th scope="row" className="py-1.5 text-left font-semibold">{r.label ?? r.key}</th>
              <td className="py-1.5 text-right font-mono tabular-nums">{formatNaira(r.gmv)}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">{r.count}</td>
              <td className="py-1.5 text-right text-muted">{share(r.gmv, total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}

/** Task 104: GMV-equivalent, how it moved, where it came from, and the service funnel. */
export function GmvPanel({ query }: {query: AnalyticsQuery;}) {
  const load = useCallback(() => getGmvAnalytics(query), [query]);
  const { data, status, error, reload } = useAsyncData(load);
  const file = (name: string) => `gwani-${name}-${data?.range.start.slice(0, 10)}-to-${data?.range.end.slice(0, 10)}.csv`;

  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <AnalyticsSkeleton />;
  const s = data.summary;
  const r = data.rates.current;
  const rp = data.rates.previous;
  const total = s.gmv.value;
  const empty = total === 0;

  return (
    <div className="space-y-4" aria-busy={status === 'loading'}>
      <PeriodBar range={data.range} previous={data.previous} compare={query.compare} generatedAt={data.generatedAt} onRefresh={reload} loading={status === 'loading'} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="GMV-equivalent" value={formatNaira(s.gmv.value)} c={s.gmv} compare={query.compare} previousText={`previous: ${formatNaira(s.gmv.previous ?? 0)}`} info={data.definition} />
        <MetricCard
          label="Completed jobs and orders"
          value={`${s.completed.value}`}
          c={s.completed}
          compare={query.compare}
          previousText={`${s.jobs.value} jobs · ${s.orders.value} orders`}
          info="Jobs and orders completed in the period." />

        <MetricCard label="Average value" value={formatNaira(s.average.value)} c={s.average} compare={query.compare} previousText={`previous: ${formatNaira(s.average.previous ?? 0)}`} info="GMV ÷ completed jobs and orders." />
        <div className="rounded-2xl border border-line bg-white px-4 py-3.5">
          <p className="text-sm font-semibold text-muted">Growth vs previous period</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">
            {s.gmv.change === null ? '—' : `${s.gmv.change > 0 ? '+' : ''}${s.gmv.change}%`}
          </p>
          <p className="mt-0.5 text-xs text-muted">GMV, against {formatNaira(s.gmv.previous ?? 0)} before</p>
        </div>
      </div>

      <ChartCard
        title={`GMV over time (${BUCKET_WORD[data.bucketSize]})`}
        info={`${data.definition} The bucket size is chosen from the length of the range.`}
        empty={empty}
        csv={{
          fileName: file('gmv-over-time'),
          rows: () => [['Period', 'Services (NGN)', 'Retail (NGN)', 'Total (NGN)', 'Previous period total (NGN)'], ...data.series.map((b) => [b.label, b.service, b.retail, b.total, b.previousTotal ?? ''])]
        }}>

        <div className="h-[300px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={compactNaira} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v: number) => formatNaira(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="service" name="Services" stroke={CHART_COLORS.pine} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="retail" name="Retail" stroke={CHART_COLORS.clay} strokeWidth={2} dot={false} />
              {query.compare && <Line type="monotone" dataKey="previousTotal" name="Previous period (total)" stroke={CHART_COLORS.axis} strokeDasharray="5 4" strokeWidth={1.5} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>GMV by {data.bucketSize}</caption>
          <tbody>
            {data.series.map((b) =>
            <tr key={b.key}><th scope="row">{b.label}</th><td>Services {formatNaira(b.service)}</td><td>Retail {formatNaira(b.retail)}</td></tr>
            )}
          </tbody>
        </table>
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="By trade" empty={empty} csv={{ fileName: file('gmv-by-trade'), rows: () => [['Trade', 'GMV (NGN)', 'Completed'], ...data.byCategory.map((x) => [x.label, x.gmv, x.count])] }}>
          <BreakdownTable rows={data.byCategory} keyLabel="Trade" total={total} />
        </ChartCard>
        <ChartCard
          title="By LGA"
          info="Where the work happened: the job address or delivery area (the vendor’s own area for pickups)."
          empty={empty}
          csv={{ fileName: file('gmv-by-lga'), rows: () => [['LGA', 'GMV (NGN)', 'Completed'], ...data.byLga.map((x) => [x.key, x.gmv, x.count])] }}>

          <BreakdownTable rows={data.byLga} keyLabel="LGA" total={total} />
        </ChartCard>
        <ChartCard title="Top 10 vendors" empty={empty} csv={{ fileName: file('top-vendors'), rows: () => [['Vendor', 'GMV (NGN)', 'Completed'], ...data.topVendors.map((x) => [x.name, x.gmv, x.count])] }}>
          <BreakdownTable rows={data.topVendors.map((v) => ({ key: v.vendorId, label: v.name, gmv: v.gmv, count: v.count }))} keyLabel="Vendor" total={total} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Service funnel"
          info={data.rateDefinitions.funnel}
          empty={data.funnel.current[0].count === 0}
          csv={{
            fileName: file('funnel'),
            rows: () => [['Step', 'Count', 'Drop-off from previous step %', '% of requests', 'Previous period count'], ...data.funnel.current.map((f, i) => [f.label, f.count, f.dropOff, f.ofRequests, data.funnel.previous[i].count])]
          }}>

          <ol className="space-y-2.5">
            {data.funnel.current.map((f, i) =>
            <li key={f.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{f.label}</span>
                  <span className="font-mono tabular-nums">
                    {f.count}
                    {query.compare && <span className="ml-2 text-xs text-muted">prev {data.funnel.previous[i].count}</span>}
                  </span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-sand" aria-hidden="true">
                  <div className="h-full rounded-full bg-pine" style={{ width: `${f.ofRequests}%` }} />
                </div>
                {i > 0 && <p className="mt-0.5 text-xs text-clay-dark">−{f.dropOff}% from {data.funnel.current[i - 1].label.toLowerCase()}</p>}
              </li>
            )}
          </ol>
        </ChartCard>

        <ChartCard
          title="Cancellations, disputes and payment"
          csv={{
            fileName: file('rates'),
            rows: () => [
            ['Measure', 'This period', 'Previous period'],
            ['Cancellation rate %', r.cancellationRate, rp.cancellationRate],
            ['Dispute rate %', r.disputeRate, rp.disputeRate],
            ['Escrow share of GMV %', r.escrowShare, rp.escrowShare],
            ['Cash share of GMV %', r.cashShare, rp.cashShare],
            ['GMV via escrow (NGN)', r.escrowGmv, rp.escrowGmv],
            ['GMV in cash (NGN)', r.cashGmv, rp.cashGmv]]

          }}>

          <dl className="grid gap-3 sm:grid-cols-2">
            {[
            { label: 'Cancellation rate', value: r.cancellationRate, prev: rp.cancellationRate, info: data.rateDefinitions.cancellation, detail: `${r.cancelled} of ${r.accepted} booked` },
            { label: 'Dispute rate', value: r.disputeRate, prev: rp.disputeRate, info: data.rateDefinitions.dispute, detail: `${r.disputed} reported, ${r.completed} completed` }].
            map((m) =>
            <div key={m.label} className="rounded-xl bg-sand px-3 py-2">
                <dt className="text-sm font-semibold text-muted">{m.label}</dt>
                <dd className="text-xl font-extrabold">{m.value}%</dd>
                <dd className="text-xs text-muted">{m.detail}</dd>
                {query.compare &&
              <dd>
                    <Delta c={{ value: m.value, previous: m.prev, change: Math.round((m.value - m.prev) * 10) / 10 }} upIsGood={false} suffix=" pts" />
                  </dd>
              }
              </div>
            )}
          </dl>
          <div className="mt-4">
            <p className="text-sm font-semibold text-muted">How GMV was paid</p>
            <div className="mt-1.5 flex h-4 overflow-hidden rounded-full bg-sand" aria-hidden="true">
              <div className="bg-pine" style={{ width: `${r.escrowShare}%` }} />
              <div className="bg-mustard" style={{ width: `${r.cashShare}%` }} />
            </div>
            <p className="mt-1.5 text-sm">
              <span className="font-bold text-pine">Escrow {r.escrowShare}%</span> ({formatNaira(r.escrowGmv)}) ·{' '}
              <span className="font-bold text-mustard-dark">Cash {r.cashShare}%</span> ({formatNaira(r.cashGmv)})
              {r.unpaidGmv > 0 && <span className="text-muted"> · not yet paid {formatNaira(r.unpaidGmv)}</span>}
            </p>
            <p className="mt-1 text-xs text-muted">{data.rateDefinitions.escrowShare}</p>
          </div>
        </ChartCard>
      </div>
    </div>);

}
