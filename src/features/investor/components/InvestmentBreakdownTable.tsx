import { Price } from '../../../components/ui/Price';
import type { InvestmentBreakdown } from '../types';

/** One row per stake: invested, share of the investment, and its dividends. */
export function InvestmentBreakdownTable({ rows }: {rows: InvestmentBreakdown[];}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Your investments: amount invested, share, and dividends for each</caption>
        <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-4 py-3">Investment</th>
            <th scope="col" className="px-4 py-3 text-right">Invested</th>
            <th scope="col" className="px-4 py-3 text-right">Share</th>
            <th scope="col" className="px-4 py-3 text-right">Accrued</th>
            <th scope="col" className="px-4 py-3 text-right">Paid out</th>
            <th scope="col" className="px-4 py-3 text-right">Available</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) =>
          <tr key={r.investment.id}>
              <th scope="row" className="px-4 py-3 font-normal">
                <span className="block font-bold text-ink">{r.investment.name}</span>
                <span className="block text-xs text-muted">{r.investment.description}</span>
              </th>
              <td className="px-4 py-3 text-right"><Price amount={r.invested} /></td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{r.sharePercent.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right"><Price amount={r.accrued} /></td>
              <td className="px-4 py-3 text-right"><Price amount={r.paidOut} /></td>
              <td className="px-4 py-3 text-right font-bold"><Price amount={r.available} /></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}
