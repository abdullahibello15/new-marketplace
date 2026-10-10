import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { formatNaira } from '../../../utils/format';
import { CHART_PERIOD, CHART_PERIOD_META } from '../constants';
import type { AccumulationPoint, ChartPeriod } from '../types';

const PERIOD_OPTIONS = Object.values(CHART_PERIOD).map((id) => ({ id, label: CHART_PERIOD_META[id].label }));
const COLORS = { accrued: '#1F4B4D', paid: '#CF5A2E', grid: '#E7DECB', axis: '#6B665B' } as const;

const compact = (v: number) => v === 0 ? '0' : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}m` : `${Math.round(v / 1000)}k`;

interface DividendChartProps {
  points: AccumulationPoint[];
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}

/** Cumulative dividends accrued vs paid out, month by month, with a text version for screen readers. */
export function DividendChart({ points, period, onPeriodChange }: DividendChartProps) {
  return (
    <figure className="rounded-2xl border border-line bg-white p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-sm font-semibold text-muted">Dividends over time (cumulative)</figcaption>
        <SegmentedControl<ChartPeriod> label="Chart period" options={PERIOD_OPTIONS} value={period} onChange={onPeriodChange} />
      </div>
      {points.length === 0 ?
      <p className="mt-6 text-sm text-muted">Nothing to chart yet: dividends show here once they’re declared.</p> :

      <div className="mt-4 h-[240px] w-full lg:h-[280px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: COLORS.axis, fontSize: 12, fontWeight: 600 }} minTickGap={16} />
              <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: COLORS.axis, fontSize: 12 }} tickFormatter={compact} />
              <Tooltip
              content={({ active, payload, label }) =>
              active && payload?.length ?
              <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      <p className="font-semibold text-muted">{label}</p>
                      {payload.map((p) =>
                <p key={String(p.dataKey)} className="font-bold text-ink">
                          {p.name}: {formatNaira(Number(p.value))}
                        </p>
                )}
                    </div> :
              null
              } />

              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
              <Area type="monotone" dataKey="accrued" name="Accrued" stroke={COLORS.accrued} fill={COLORS.accrued} fillOpacity={0.15} strokeWidth={2} animationDuration={300} />
              <Area type="monotone" dataKey="paid" name="Paid out" stroke={COLORS.paid} fill={COLORS.paid} fillOpacity={0.15} strokeWidth={2} animationDuration={300} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      }
      <table className="sr-only">
        <caption>Cumulative dividends by month, {CHART_PERIOD_META[period].label}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Accrued</th>
            <th scope="col">Paid out</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) =>
          <tr key={p.month}>
              <th scope="row">{p.label}</th>
              <td>{formatNaira(p.accrued)}</td>
              <td>{formatNaira(p.paid)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </figure>);

}
