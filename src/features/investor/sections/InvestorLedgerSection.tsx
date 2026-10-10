import { BookOpenIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { LedgerFiltersBar } from '../components/LedgerFiltersBar';
import { LedgerTable } from '../components/LedgerTable';
import { useInvestorDashboard } from '../hooks/useInvestorDashboard';
import { useLedgerView } from '../hooks/useLedgerView';
import type { InvestorDashboard } from '../types';

const EMPTY: InvestorDashboard['entries'] = [];

/** /investor/ledger — every entry (read-only) with its running balance, filters and CSV export. */
export function InvestorLedgerSection() {
  const d = useInvestorDashboard();
  const view = useLedgerView(d.data?.entries ?? EMPTY, d.data?.investments ?? []);

  function renderBody() {
    if (d.status === 'error' && !d.data) return <ErrorState message={d.error ?? ''} onRetry={d.reload} />;
    if (!d.data) return <LoadingState label="Loading your ledger" rows={4} rowClassName="h-16" />;
    if (d.data.entries.length === 0) {
      return <EmptyState icon={BookOpenIcon} title="No ledger entries yet" description="Your contributions, dividends and payouts will show here." />;
    }
    return (
      <div className="space-y-4">
        <LedgerFiltersBar
          filters={view.filters}
          onChange={view.update}
          onReset={view.reset}
          filtered={view.filtered}
          rangeError={view.rangeError}
          onExport={view.exportCsv}
          canExport={view.rows.length > 0} />

        <p className="text-sm text-muted" aria-live="polite">
          {view.rows.length} of {d.data.entries.length} entries · read-only: entries are recorded by Gwani and can’t be edited.
        </p>
        {view.rows.length === 0 ?
        <EmptyState
          icon={SearchXIcon}
          title="No entries match"
          action={
          <Button variant="secondary" size="sm" onClick={view.reset}>
                Clear filters
              </Button>
          } /> :


        <LedgerTable rows={view.newestFirst} investments={d.data.investments} />
        }
      </div>);

  }

  return (
    <>
      <PageHeader title="Ledger" subtitle="Contributions, dividends, payouts and adjustments, with your running balance" />
      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
