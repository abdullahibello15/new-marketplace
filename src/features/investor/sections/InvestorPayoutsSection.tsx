import { WalletIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { PayoutRequestCard } from '../components/PayoutRequestCard';
import { PayoutRequestsList } from '../components/PayoutRequestsList';
import { useInvestorDashboard } from '../hooks/useInvestorDashboard';

/** /investor/payouts — request a payout, and every request with its status. */
export function InvestorPayoutsSection() {
  const d = useInvestorDashboard();

  function renderBody() {
    if (d.status === 'error' && !d.data) return <ErrorState message={d.error ?? ''} onRetry={d.reload} />;
    if (!d.data) return <LoadingState label="Loading payouts" rows={3} rowClassName="h-20" />;
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="requests-heading" className="min-w-0 space-y-3">
          <h2 id="requests-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
            Payout requests
          </h2>
          {d.data.payoutRequests.length ?
          <PayoutRequestsList requests={d.data.payoutRequests} approving={d.busy === 'approve'} onApproveNow={(id) => void d.approveNow(id)} /> :

          <EmptyState icon={WalletIcon} title="No payouts yet" description="When you request a payout of your available dividends, it shows here with its status." />
          }
        </section>
        <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start" aria-label="Request a payout">
          <PayoutRequestCard
            balances={d.data.balances}
            payoutAccount={d.data.investor.payoutAccount}
            hasPending={d.hasPending}
            busy={d.busy === 'request'}
            onRequest={d.requestPayout} />

        </aside>
      </div>);

  }

  return (
    <>
      <PageHeader title="Payouts" subtitle="Request your available dividends and follow each request" />
      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
