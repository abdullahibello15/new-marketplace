import { useTranslation } from 'react-i18next';
import { StatTile } from '../../../../components/StatTile';
import { formatNaira } from '../../../../utils/format';
import type { EarningsSummary } from '../../types';

/** Where the vendor's money is (held, available, paid out), then what was released in each period. All net of commission. */
export function EarningsSummaryCards({ summary }: {summary: EarningsSummary;}) {
  const { t } = useTranslation('vendor');
  return (
    <div className="space-y-3">
      <section aria-label={t('earnings.balances')} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile value={formatNaira(summary.pending)} label={t('earnings.pending')} />
        <StatTile value={formatNaira(summary.available)} label={t('earnings.available')} />
        <StatTile value={formatNaira(summary.paidOut)} label={t('earnings.paidOut')} />
      </section>
      <section aria-label={t('earnings.released')} className="grid grid-cols-3 gap-3">
        <StatTile value={formatNaira(summary.thisWeek)} label={t('earnings.thisWeek')} />
        <StatTile value={formatNaira(summary.thisMonth)} label={t('earnings.thisMonth')} />
        <StatTile value={formatNaira(summary.allTime)} label={t('earnings.allTime')} />
      </section>
    </div>);

}
