import { EarningsChart } from '../../../../components/vendor/EarningsChart';
import { formatNaira } from '../../../../utils/format';
import { EARNINGS_CHART_MONTHS } from '../../constants';
import type { ChartPoint } from '../../../../utils/earnings';

/** Reuses the shared bar chart, with a text version of the same numbers for screen readers. */
export function MonthlyEarningsChart({ data }: {data: ChartPoint[];}) {
  return (
    <figure className="rounded-2xl border border-line bg-white p-4 lg:p-6">
      <figcaption className="text-sm font-semibold text-muted">Earnings, last {EARNINGS_CHART_MONTHS} months</figcaption>
      <div className="mt-4" aria-hidden="true">
        <EarningsChart data={data} />
      </div>
      <ul className="sr-only">
        {data.map((d) =>
        <li key={d.label}>
            {d.label}: {formatNaira(d.total)}
          </li>
        )}
      </ul>
    </figure>);

}
