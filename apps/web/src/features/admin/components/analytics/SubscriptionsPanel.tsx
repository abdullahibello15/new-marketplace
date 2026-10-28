import { useCallback } from 'react';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '../../../../components/ui/Badge';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { formatNaira } from '../../../../utils/format';
import { SUBSCRIPTION_STATUS_META } from '../../../vendor-dashboard/constants';
import { getSubscriptionAnalytics } from '../../services/analyticsService';
import { AnalyticsSkeleton, ChartCard, Delta, MetricCard } from './AnalyticsParts';
import { CHART_COLORS, compactNaira } from './chartUtils';
import { PeriodBar } from './AnalyticsControls';
import type { AnalyticsQuery } from '../../analytics/types';
import type { RevenueLine } from '../../analytics/aggregations';

const LINE_COLORS: Record<RevenueLine, string> = { starter: CHART_COLORS.mustard, standard: CHART_COLORS.pine, premium: CHART_COLORS.purple, bundle: CHART_COLORS.clay };

/** Task 105: subscription revenue, subscribers, renewals and risk; escrow commission kept separate. */
export function SubscriptionsPanel({ query }: {query: AnalyticsQuery;}) {
  const load = useCallback(() => getSubscriptionAnalytics(query), [query]);
  const { data, status, error, reload } = useAsyncData(load);
  const file = (name: string) => `gwani-${name}-${data?.range.start.slice(0, 10)}-to-${data?.range.end.slice(0, 10)}.csv`;

  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <AnalyticsSkeleton />;
  const s = data.summary;
  const d = data.definitions;
  const revenueEmpty = s.revenue.value === 0;
  const mixTotal = data.planMix.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="space-y-4" aria-busy={status === 'loading'}>
      <PeriodBar range={data.range} previous={data.previous} compare={query.compare} generatedAt={data.generatedAt} onRefresh={reload} loading={status === 'loading'} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="MRR" value={formatNaira(s.mrr.value)} c={s.mrr} compare={query.compare} previousText={`previous: ${formatNaira(s.mrr.previous ?? 0)}`} info={d.mrr} />
        <MetricCard label="Revenue in period" value={formatNaira(s.revenue.value)} c={s.revenue} compare={query.compare} previousText={`previous: ${formatNaira(s.revenue.previous ?? 0)}`} info="Subscription payments received in the period (plans and bundles)." />
        <MetricCard label="Active subscribers" value={String(s.subscribers.value)} c={s.subscribers} compare={query.compare} previousText={`previous: ${s.subscribers.previous}`} info="Active, expiring soon or in the grace period at the end of the period." />
        <MetricCard label="Churn rate" value={`${s.churnRate.value}%`} c={s.churnRate} compare={query.compare} upIsGood={false} previousText={`previous: ${s.churnRate.previous}%`} info={d.churn} />
        <MetricCard label="ARPU" value={formatNaira(s.arpu.value)} c={s.arpu} compare={query.compare} previousText={`previous: ${formatNaira(s.arpu.previous ?? 0)}`} info={d.arpu} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartCard
          title="Revenue by plan and bundle"
          empty={revenueEmpty}
          csv={{
            fileName: file('subscription-revenue-over-time'),
            rows: () => [['Period', 'Starter (NGN)', 'Standard (NGN)', 'Premium (NGN)', 'Association bundles (NGN)'], ...data.series.map((b) => [b.label, b.starter, b.standard, b.premium, b.bundle])]
          }}>

          <div className="h-[280px]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tickFormatter={compactNaira} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(v: number) => formatNaira(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.byLine.map((l) =>
                <Bar key={l.line} dataKey={l.line} name={l.label} stackId="revenue" fill={LINE_COLORS[l.line]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Subscription revenue by plan and bundle</caption>
            <thead className="text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="py-1.5 text-left">Line</th>
                <th scope="col" className="py-1.5 text-right">Revenue</th>
                <th scope="col" className="py-1.5 text-right">Previous</th>
                <th scope="col" className="py-1.5 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.byLine.map((l) =>
              <tr key={l.line}>
                  <th scope="row" className="py-1.5 text-left font-semibold">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LINE_COLORS[l.line] }} aria-hidden="true" />
                    {l.label}
                  </th>
                  <td className="py-1.5 text-right font-mono tabular-nums">{formatNaira(l.revenue)}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-muted">{formatNaira(l.previous)}</td>
                  <td className="py-1.5 text-right">
                    <Delta c={{ value: l.revenue, previous: l.previous, change: l.previous ? Math.round((l.revenue - l.previous) / l.previous * 1000) / 10 : l.revenue ? null : 0 }} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ChartCard>

        <ChartCard
          title="Plan mix"
          info="Current subscribers at the end of the period, by plan (bundle members under Association bundles)."
          empty={mixTotal === 0}
          csv={{ fileName: file('plan-mix'), rows: () => [['Plan', 'Subscribers'], ...data.planMix.map((m) => [m.label, m.count])] }}>

          <div className="h-[220px]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.planMix} dataKey="count" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                  {data.planMix.map((m) =>
                  <Cell key={m.line} fill={LINE_COLORS[m.line]} />
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {data.planMix.map((m) =>
            <li key={m.line} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LINE_COLORS[m.line] }} aria-hidden="true" />
                {m.label}: <strong>{m.count}</strong>
              </li>
            )}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-sm">
            <div>
              <dt className="text-muted">Upgrades</dt>
              <dd className="text-lg font-extrabold">{data.planChanges.current.upgrades}{query.compare && <span className="ml-1 text-xs font-normal text-muted">prev {data.planChanges.previous.upgrades}</span>}</dd>
            </div>
            <div>
              <dt className="text-muted">Downgrades</dt>
              <dd className="text-lg font-extrabold">{data.planChanges.current.downgrades}{query.compare && <span className="ml-1 text-xs font-normal text-muted">prev {data.planChanges.previous.downgrades}</span>}</dd>
            </div>
          </dl>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Subscribers by status"
          info="At the end of the period, using the same status rules as the rest of Gwani. Closed accounts aren’t counted."
          csv={{
            fileName: file('subscribers-by-status'),
            rows: () => [
            ['Status', 'Subscribers'],
            ...data.statuses.map((x) => [SUBSCRIPTION_STATUS_META[x.status].label, x.count]),
            [],
            ['Movement', 'This period', 'Previous period'],
            ['New', data.movements.current.newCount, data.movements.previous.newCount],
            ['Renewing', data.movements.current.renewing, data.movements.previous.renewing],
            ['Lapsed', data.movements.current.lapsed, data.movements.previous.lapsed]]

          }}>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.statuses.map((x) =>
            <div key={x.status} className="rounded-xl bg-sand px-3 py-2">
                <Badge tone={SUBSCRIPTION_STATUS_META[x.status].tone} dot>{SUBSCRIPTION_STATUS_META[x.status].label}</Badge>
                <p className="mt-1 text-xl font-extrabold">{x.count}</p>
              </div>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
            {([['New', 'newCount', 'First subscription payment in the period.'], ['Renewing', 'renewing', 'Started another paid period in the period.'], ['Lapsed', 'lapsed', 'Grace period ran out in the period without a renewal.']] as const).map(([label, key, hint]) =>
            <div key={key} className="rounded-xl border border-line px-3 py-2">
                <dt className="text-muted" title={hint}>{label}</dt>
                <dd className="text-lg font-extrabold">
                  {data.movements.current[key]}
                  {query.compare && <span className="ml-1 text-xs font-normal text-muted">prev {data.movements.previous[key]}</span>}
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-4 rounded-xl bg-[#E3EEEC] px-3 py-2 text-sm">
            <p className="font-semibold">
              Renewal rate: {data.renewal.current.rate === null ? '—' : `${data.renewal.current.rate}%`}
              {query.compare && data.renewal.previous.rate !== null && <span className="ml-2 text-xs font-normal text-muted">previous {data.renewal.previous.rate}%</span>}
            </p>
            <p className="text-xs text-muted">
              {data.renewal.current.renewed} of {data.renewal.current.ended} periods that ended were renewed. {d.renewal}
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title={`Revenue at risk: next ${data.atRisk.days} days`}
          info="Subscribers whose paid period ends within 30 days of the end of the period, or who are already in their grace period. Renewal is manual, so each is at risk until they pay."
          empty={data.atRisk.vendors.length === 0}
          emptyText="No subscriptions end in the next 30 days."
          csv={{
            fileName: file('revenue-at-risk'),
            rows: () => [['Vendor', 'Ends on', 'Status', 'Monthly value (NGN)', 'Via bundle'], ...data.atRisk.vendors.map((v) => [v.name, v.endsOn.slice(0, 10), v.status, v.monthlyValue, v.viaBundle ? 'yes' : 'no'])]
          }}>

          <p className="text-2xl font-extrabold">{formatNaira(data.atRisk.total)}<span className="ml-2 text-sm font-normal text-muted">a month, from {data.atRisk.vendors.length} vendors</span></p>
          <ul className="mt-3 max-h-[260px] divide-y divide-line overflow-y-auto text-sm">
            {data.atRisk.vendors.map((v) =>
            <li key={v.vendorId} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate font-semibold">{v.name}{v.viaBundle && <span className="ml-1 text-xs font-normal text-muted">(bundle)</span>}</span>
                {v.status !== 'none' && <Badge tone={SUBSCRIPTION_STATUS_META[v.status].tone}>{SUBSCRIPTION_STATUS_META[v.status].label}</Badge>}
                <span className="w-20 text-right text-xs text-muted">{format(new Date(v.endsOn), 'd MMM')}</span>
                <span className="w-24 text-right font-mono tabular-nums">{formatNaira(v.monthlyValue)}</span>
              </li>
            )}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="projection-heading" className="rounded-2xl border border-dashed border-mustard bg-[#FBF3DC] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="projection-heading" className="flex-1 font-bold">Next month’s subscription revenue</h3>
            <Badge tone="warning">Estimate</Badge>
          </div>
          <p className="mt-1 text-2xl font-extrabold">{formatNaira(data.projection.estimate)}</p>
          <p className="mt-1 text-xs text-muted">
            {formatNaira(data.projection.basedOnMrr)} MRR × {data.projection.basedOnRenewalRate ?? 100}% renewal rate. {d.projection}
          </p>
        </section>
        <section aria-labelledby="commission-heading" className="rounded-2xl border border-line bg-white p-4">
          <h3 id="commission-heading" className="font-bold">Escrow commission (not subscription revenue)</h3>
          <p className="mt-1 text-2xl font-extrabold">{formatNaira(data.commission.value)}</p>
          {query.compare && <Delta c={data.commission} />}
          <p className="mt-1 text-xs text-muted">{d.commission}</p>
        </section>
      </div>
    </div>);

}
