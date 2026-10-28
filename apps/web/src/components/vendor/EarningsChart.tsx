import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNaira } from '../../utils/format';
import type { ChartPoint } from '../../utils/earnings';

export function EarningsChart({ data }: {data: ChartPoint[];}) {
  return (
    <div className="h-[220px] w-full lg:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E7DECB" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6B665B', fontSize: 12, fontWeight: 600 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={40}
            tick={{ fill: '#6B665B', fontSize: 12 }}
            tickFormatter={(v: number) => v === 0 ? '0' : `${Math.round(v / 1000)}k`} />
          
          <Tooltip
            cursor={{ fill: '#F1ECDF' }}
            content={({ active, payload, label }) =>
            active && payload && payload.length ?
            <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
                  <p className="font-semibold text-muted">{label}</p>
                  <p className="font-extrabold text-ink">{formatNaira(Number(payload[0].value))}</p>
                </div> :
            null
            } />
          
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={300}>
            {data.map((d) =>
            <Cell key={d.label} fill={d.highlight ? '#CF5A2E' : '#1F4B4D'} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);

}