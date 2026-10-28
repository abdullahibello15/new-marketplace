import { useTranslation } from 'react-i18next';
import { StatTile } from '../StatTile';
import type { StockSummary as StockSummaryData } from '../../utils/products';

const count = (n: number) => n.toLocaleString('en-NG');

export function StockSummary({ summary }: {summary: StockSummaryData;}) {
  const { t } = useTranslation('vendor');
  return (
    <section aria-label={t('products.stockSummary')} className="mt-5 grid grid-cols-3 gap-3">
      <StatTile value={count(summary.total)} label={t('products.total')} />
      <StatTile value={count(summary.low)} label={t('products.stockFilter.low_stock.label')} />
      <StatTile value={count(summary.out)} label={t('products.stockFilter.out_of_stock.label')} />
    </section>);

}
