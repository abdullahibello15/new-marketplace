import { StatTile } from '../../../../components/StatTile';
import { formatNaira } from '../../../../utils/format';
import type { EarningsSummary } from '../../types';

export function EarningsSummaryCards({ summary }: {summary: EarningsSummary;}) {
  return (
    <section aria-label="Earnings summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile value={formatNaira(summary.thisWeek)} label="This week" />
      <StatTile value={formatNaira(summary.thisMonth)} label="This month" />
      <StatTile value={formatNaira(summary.allTime)} label="All time" />
      <StatTile value={formatNaira(summary.pendingPayouts)} label="Pending payouts" />
    </section>);

}
