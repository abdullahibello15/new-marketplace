import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/format';
import { ArrowUpRightIcon, DownloadIcon, ReceiptTextIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { Price } from '../../../components/ui/Price';
import { ReportProblemDialog } from '../../jobs/components/customer/ReportProblemDialog';
import { CopyField } from '../components/CopyField';
import { PaymentOutcome } from '../components/PaymentOutcome';
import { EscrowLedger } from '../components/escrow/EscrowLedger';
import { EscrowStatusBadge } from '../components/escrow/EscrowStatusBadge';
import { ReceiptBreakdownTable } from '../components/receipt/ReceiptBreakdownTable';
import { TransactionStatusBadge } from '../components/transactions/TransactionStatusBadge';
import { PAYMENT_METHOD, PAYMENT_ROUTES, PAYMENT_SUBJECT, TRANSACTION_STATUS } from '../constants';
import { useReceiptDownload } from '../hooks/useReceiptDownload';
import { useTransaction } from '../hooks/useTransaction';
import { translate } from '../../../i18n/message';
import { methodLabel } from '../utils/receiptData';
import { subjectPath } from '../utils/subject';
import type { TransactionDetail } from '../types';

const when = (iso: string) => formatDate(iso, 'd MMM yyyy, h:mm a');

function Card({ id, title, children }: {id: string;title: string;children: ReactNode;}) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id={id} className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
        {title}
      </h2>
      {children}
    </section>);

}

/** Where the money is: the escrow status and its event timeline, or why there's no escrow. */
function EscrowCard({ d }: {d: TransactionDetail;}) {
  const { t } = useTranslation('payments');
  const { payment, escrow, transaction } = d;
  return (
    <Card id="tx-escrow" title={t('tx.escrowTimeline')}>
      <ol className="mb-3 space-y-1 text-sm">
        <li>
          <span className="font-semibold text-ink">{t('tx.started')}</span> <span className="text-muted">· {when(payment.createdAt)}</span>
        </li>
        {payment.paidAt &&
        <li>
            <span className="font-semibold text-ink">{t('tx.paid')}</span> <span className="text-muted">· {when(payment.paidAt)}</span>
          </li>
        }
        {transaction.status === TRANSACTION_STATUS.Failed &&
        <li>
            <span className="font-semibold text-ink">{t('tx.notCompleted')}</span> <span className="text-muted">· {when(payment.updatedAt)}</span>
          </li>
        }
      </ol>
      {escrow ?
      <div className="space-y-2">
          <EscrowStatusBadge status={escrow.status} />
          <EscrowLedger escrow={escrow} open />
        </div> :

      <p className="text-sm text-muted">
          {payment.method === PAYMENT_METHOD.Cash ?
        t('tx.cashNoEscrow') :
        t('tx.nothingHeld')}
        </p>
      }
    </Card>);

}

/** /payments/:reference — one payment in full: breakdown, escrow timeline, receipt, and "Report a problem". */
export function TransactionDetailSection() {
  const { t: tr } = useTranslation('payments');
  const { reference = '' } = useParams();
  const t = useTransaction(reference);
  const download = useReceiptDownload();
  const [reporting, setReporting] = useState(false);
  const d = t.data;

  function renderBody() {
    if (t.status === 'error') return <ErrorState title={tr('tx.notFound')} message={t.error ?? ''} onRetry={t.reload} />;
    if (!d) return <LoadingState label={tr('checkout.loading')} rows={3} rowClassName="h-40" />;
    const { payment, transaction: tx } = d;
    const isJob = payment.subject.kind === PAYMENT_SUBJECT.Job;
    const retry = tx.status === TRANSACTION_STATUS.Pending || tx.status === TRANSACTION_STATUS.Failed;

    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="tx-summary" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="tx-summary" className="sr-only">{tr('tx.paymentSummary')}</h2>
                <Price amount={payment.amount} className="text-3xl font-extrabold text-ink" />
                <p className="mt-1 text-sm text-muted">
                  {translate(methodLabel(payment))} · {when(tx.date)}
                </p>
              </div>
              <TransactionStatusBadge status={tx.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">{tr('tx.for')}</dt>
                <dd>
                  <Link to={subjectPath(payment.subject)} className="font-semibold text-pine hover:underline">
                    {payment.description}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted">{tr('tx.vendor')}</dt>
                <dd className="font-semibold text-ink">
                  {d.vendor.name}
                  {(d.vendor.trade || d.vendor.location) &&
                  <span className="block text-xs font-normal text-muted">{[d.vendor.trade, d.vendor.location].filter(Boolean).join(' · ')}</span>
                  }
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <CopyField label={tr('tx.reference')} display={payment.reference} />
            </div>
            <div className="mt-4">
              <PaymentOutcome payment={payment} />
            </div>
          </section>

          <Card id="tx-breakdown" title={tr('tx.breakdown')}>
            <ReceiptBreakdownTable breakdown={d.breakdown} itemsLabel={isJob ? tr('receipt.service') : tr('receipt.items')} />
          </Card>

          <EscrowCard d={d} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start" aria-label={tr('tx.actions')}>
          <section className="space-y-2 rounded-2xl border border-line bg-white p-4">
            {tx.hasReceipt ?
            <>
                <Button icon={DownloadIcon} fullWidth loading={download.busy === payment.reference} onClick={() => void download.downloadByReference(payment.reference)}>
                  {tx.status === TRANSACTION_STATUS.Refunded && tx.refunded >= tx.amount ? tr('tx.downloadRefundPdf') : tr('tx.downloadReceiptPdf')}
                </Button>
                <Link to={PAYMENT_ROUTES.receipt(payment.reference)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
                  <ReceiptTextIcon className="h-4 w-4" aria-hidden="true" />
                  {tr('tx.viewPrint')}
                </Link>
              </> :

            <p className="text-sm text-muted">{tr('tx.receiptOnce')}</p>
            }
            {retry && payment.subject.kind !== PAYMENT_SUBJECT.Subscription &&
            <Link to={PAYMENT_ROUTES.checkout(payment.subject.kind, payment.subject.id)} className={buttonClasses({ fullWidth: true })}>
                <RefreshCwIcon className="h-4 w-4" aria-hidden="true" />
                {tx.status === TRANSACTION_STATUS.Failed ? tr('tx.tryAgain') : tr('tx.continue')}
              </Link>
            }
            <Link to={subjectPath(payment.subject)} className={buttonClasses({ variant: 'outline', fullWidth: true })}>
              <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
              {isJob ? tr('tx.goToJob', { id: payment.subject.id }) : tr('tx.goToOrder', { id: payment.subject.id })}
            </Link>
          </section>

          <section aria-labelledby="tx-report" className="rounded-2xl border border-line bg-white p-4 text-sm">
            <h2 id="tx-report" className="font-bold text-ink">{tr('tx.somethingWrong')}</h2>
            <p className="mt-1 text-muted">
              {tr('tx.reportText')}
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={TriangleAlertIcon}
              onClick={() => setReporting(true)}
              disabled={d.reportBlockedReason !== null}
              aria-describedby={d.reportBlockedReason ? 'tx-report-blocked' : undefined}
              className="mt-3">

              {tr('tx.report')}
            </Button>
            {d.reportBlockedReason &&
            <p id="tx-report-blocked" className="mt-2 text-xs text-muted">
                {d.reportBlockedReason}
              </p>
            }
            {d.reportBlockedReason === null &&
            <ReportProblemDialog open={reporting} vendorName={payment.vendorName} onSubmit={t.report} onClose={() => setReporting(false)} />
            }
          </section>
        </aside>
      </div>);

  }

  return (
    <>
      <PageHeader
        title={d ? d.payment.vendorName : tr('checkout.payment')}
        subtitle={d ? d.payment.description : undefined}
        backTo={{ to: PAYMENT_ROUTES.transactions, label: tr('tx.title') }} />

      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
