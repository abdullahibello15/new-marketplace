import { useTranslation } from 'react-i18next';
import { ReceiptIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { vendorAccount } from '../../../data/vendorPortal';
import { EarningsSummaryCards } from '../components/earnings/EarningsSummaryCards';
import { MonthlyEarningsChart } from '../components/earnings/MonthlyEarningsChart';
import { PayoutCard } from '../components/earnings/PayoutCard';
import { TransactionsTable } from '../components/earnings/TransactionsTable';
import { useEarnings } from '../hooks/useEarnings';

/** Earnings: Pending (held in escrow), Available and Paid out, released totals, and transactions with their escrow ledger. */
export function EarningsSection() {
  const { t } = useTranslation('vendor');
  const { overview, chartData, status, error, reload, withdraw, withdrawing } = useEarnings();

  function renderBody() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!overview) return <LoadingState label={t('earnings.loading')} rows={3} rowClassName="h-40" />;
    return (
      <div className="space-y-8">
        <EarningsSummaryCards summary={overview.summary} />
        <MonthlyEarningsChart data={chartData} />
        <section aria-labelledby="transactions-heading">
          <h2 id="transactions-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
            {t('earnings.recent')}
          </h2>
          <div className="mt-3">
            {overview.transactions.length > 0 ?
            <TransactionsTable transactions={overview.transactions} /> :

            <EmptyState icon={ReceiptIcon} title={t('earnings.emptyTitle')} description={t('earnings.emptyText')} />
            }
          </div>
        </section>
      </div>);

  }

  return (
    <>
      <PageHeader title={t('earnings.title')} subtitle={t('earnings.subtitle', { account: vendorAccount.payoutAccount })} />
      <PageContainer className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0">{renderBody()}</div>
        <aside className="order-first lg:order-none lg:sticky lg:top-8 lg:self-start" aria-label={t('earnings.balance')}>
          {overview ?
          <PayoutCard available={overview.summary.available} pending={overview.summary.pending} busy={withdrawing} onWithdraw={withdraw} /> :
          <div role="status" aria-label={t('earnings.loadingBalance')} className="h-56 animate-pulse rounded-2xl bg-sand" />
          }
        </aside>
      </PageContainer>
    </>);

}
