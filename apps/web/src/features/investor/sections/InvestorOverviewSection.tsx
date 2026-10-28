import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { CHART_PERIOD, INVESTOR_ROUTES, RECENT_ENTRIES_LIMIT } from '../constants';
import { DividendChart } from '../components/DividendChart';
import { InvestmentBreakdownTable } from '../components/InvestmentBreakdownTable';
import { InvestorOverviewCards } from '../components/InvestorOverviewCards';
import { LedgerTable } from '../components/LedgerTable';
import { NextDividendCard } from '../components/NextDividendCard';
import { PayoutRequestCard } from '../components/PayoutRequestCard';
import { useInvestorDashboard } from '../hooks/useInvestorDashboard';
import { accumulationSeries, withRunningBalance } from '../utils/ledger';
import type { ChartPeriod } from '../types';

/** /investor — headline figures, the accumulation chart, next dividend, payout, and stakes. */
export function InvestorOverviewSection() {
  const d = useInvestorDashboard();
  const [period, setPeriod] = useState<ChartPeriod>(CHART_PERIOD.OneYear);
  const entries = d.data?.entries;
  const points = useMemo(() => entries ? accumulationSeries(entries, period, new Date()) : [], [entries, period]);
  const recent = useMemo(() => entries ? withRunningBalance(entries).slice(-RECENT_ENTRIES_LIMIT).reverse() : [], [entries]);

  function renderBody() {
    if (d.status === 'error' && !d.data) return <ErrorState message={d.error ?? ''} onRetry={d.reload} />;
    if (!d.data) return <LoadingState label="Loading your investments" rows={3} rowClassName="h-32" />;
    const data = d.data;
    return (
      <div className="space-y-6">
        <InvestorOverviewCards balances={data.balances} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <DividendChart points={points} period={period} onPeriodChange={setPeriod} />
            {data.breakdown.length > 1 &&
            <section aria-labelledby="stakes-heading" className="space-y-3">
                <h2 id="stakes-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
                  Your investments
                </h2>
                <InvestmentBreakdownTable rows={data.breakdown} />
              </section>
            }
            <section aria-labelledby="recent-heading" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="recent-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
                  Latest ledger entries
                </h2>
                <Link to={INVESTOR_ROUTES.ledger} className="text-sm font-bold text-pine hover:underline">
                  Full ledger
                </Link>
              </div>
              <LedgerTable rows={recent} investments={data.investments} />
            </section>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="Payout and next dividend">
            <PayoutRequestCard
              balances={data.balances}
              payoutAccount={data.investor.payoutAccount}
              hasPending={d.hasPending}
              busy={d.busy === 'request'}
              onRequest={d.requestPayout} />

            <NextDividendCard next={data.nextDividend} />
          </aside>
        </div>
      </div>);

  }

  return (
    <>
      <PageHeader title={d.data ? `Hello, ${d.data.investor.name.split(' ')[0]}` : 'Investor'} subtitle="Your dividends, worked out from your ledger" />
      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
