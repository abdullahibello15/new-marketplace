import { StatTile } from '../StatTile';
import type { StockSummary as StockSummaryData } from '../../utils/products';

const count = (n: number) => n.toLocaleString('en-NG');

export function StockSummary({ summary }: {summary: StockSummaryData;}) {
  return (
    <section aria-label="Stock summary" className="mt-5 grid grid-cols-3 gap-3">
      <StatTile value={count(summary.total)} label="Total products" />
      <StatTile value={count(summary.low)} label="Low stock" />
      <StatTile value={count(summary.out)} label="Out of stock" />
    </section>);

}
