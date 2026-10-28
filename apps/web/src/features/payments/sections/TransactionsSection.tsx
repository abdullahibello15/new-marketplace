import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReceiptTextIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { BulkReceiptDownload } from '../components/transactions/BulkReceiptDownload';
import { TransactionFiltersBar } from '../components/transactions/TransactionFiltersBar';
import { TransactionRow } from '../components/transactions/TransactionRow';
import { TransactionSummaryCards } from '../components/transactions/TransactionSummaryCards';
import { useReceiptDownload } from '../hooks/useReceiptDownload';
import { useTransactions } from '../hooks/useTransactions';

/** /payments — every payment the customer has made or started, with filters, receipts and a summary. */
export function TransactionsSection() {
  const { t: tr } = useTranslation('payments');
  const t = useTransactions();
  const download = useReceiptDownload();
  const { list } = t;

  function renderList() {
    if (list.status === 'error' && list.items.length === 0) return <ErrorState message={list.error ?? ''} onRetry={list.retry} />;
    if (list.status === 'loading') return <LoadingState label={tr('tx.loading')} rows={4} rowClassName="h-24" />;
    if (list.items.length === 0) {
      return t.filtered ?
      <EmptyState
        icon={SearchXIcon}
        title={tr('tx.noMatch')}
        description={tr('tx.noMatchText')}
        action={
        <Button variant="secondary" size="sm" onClick={t.reset}>
              {tr('tx.clear')}
            </Button>
        } /> :


      <EmptyState
        icon={ReceiptTextIcon}
        title={tr('tx.none')}
        description={tr('tx.noneText')}
        action={
        <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {tr('tx.findVendor')}
            </Link>
        } />;


    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted" aria-live="polite">
          {tr('tx.showing', { shown: list.items.length, count: list.total })}
        </p>
        <ul className="space-y-3">
          {list.items.map((item) =>
          <li key={item.reference}>
              <TransactionRow transaction={item} downloading={download.busy === item.reference} onDownload={(ref) => void download.downloadByReference(ref)} />
            </li>
          )}
        </ul>
        {list.status === 'loadingMore' && <LoadingState label={tr('tx.loadingMore')} rows={2} rowClassName="h-24" />}
        {list.status === 'error' && <ErrorState message={list.error ?? ''} onRetry={list.retry} />}
        {list.hasMore && list.status === 'ready' &&
        <div className="flex justify-center">
            <Button variant="secondary" onClick={list.loadMore}>
              {tr('tx.loadMore')}
            </Button>
          </div>
        }
      </div>);

  }

  return (
    <>
      <PageHeader title={tr('tx.title')} subtitle={tr('tx.subtitle')} />
      <PageContainer className="space-y-5">
        {t.summary.status === 'error' && <ErrorState message={t.summary.error ?? ''} onRetry={t.summary.reload} />}
        {t.summary.data ?
        <TransactionSummaryCards summary={t.summary.data} /> :
        t.summary.status === 'loading' && <LoadingState label={tr('tx.loadingSummary')} rows={1} rowClassName="h-24" />
        }
        <TransactionFiltersBar filters={t.filters} onChange={t.update} onReset={t.reset} filtered={t.filtered} rangeError={t.rangeError} />
        {renderList()}
        <BulkReceiptDownload busy={download.busy === 'range'} onDownload={(from, to) => void download.downloadRange(from, to)} />
      </PageContainer>
    </>);

}
