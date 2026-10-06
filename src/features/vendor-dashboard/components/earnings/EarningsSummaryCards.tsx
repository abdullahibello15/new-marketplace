import { StatTile } from '../../../../components/StatTile';
import { formatNaira } from '../../../../utils/format';
import type { EarningsSummary } from '../../types';

/** Where the vendor's money is (held, available, paid out), then what was released in each period. All net of commission. */
export function EarningsSummaryCards({ summary }: {summary: EarningsSummary;}) {
  return (
    <div className="space-y-3">
      <section aria-label="Balances" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile value={formatNaira(summary.pending)} label="Pending (held in escrow)" />
        <StatTile value={formatNaira(summary.available)} label="Available" />
        <StatTile value={formatNaira(summary.paidOut)} label="Paid out" />
      </section>
      <section aria-label="Released to you" className="grid grid-cols-3 gap-3">
        <StatTile value={formatNaira(summary.thisWeek)} label="This week" />
        <StatTile value={formatNaira(summary.thisMonth)} label="This month" />
        <StatTile value={formatNaira(summary.allTime)} label="All time" />
      </section>
    </div>);

}
