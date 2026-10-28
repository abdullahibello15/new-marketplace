import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { paymentMethodLabel } from '../../../../i18n/labels';
import { ChevronRightIcon, DownloadIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { formatDate, formatNaira } from '../../../../utils/format';
import { PAYMENT_METHOD_META, PAYMENT_ROUTES, TRANSACTION_STATUS } from '../../constants';
import { subjectPath } from '../../utils/subject';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import type { TransactionListItem } from '../../types';

interface TransactionRowProps {
  transaction: TransactionListItem;
  downloading: boolean;
  onDownload: (reference: string) => void;
}

/** One payment: what it was for (linked), vendor, amount, method, status, reference, and its receipt. */
export function TransactionRow({ transaction: t, downloading, onDownload }: TransactionRowProps) {
  const { t: tr } = useTranslation('payments');
  const partRefund = t.status === TRANSACTION_STATUS.Refunded && t.refunded > 0 && t.refunded < t.amount;
  return (
    <article aria-labelledby={`tx-${t.reference}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`tx-${t.reference}`} className="font-bold text-ink">
            <Link to={PAYMENT_ROUTES.transaction(t.reference)} className="rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
              {t.vendorName}
            </Link>
          </h3>
          <TransactionStatusBadge status={t.status} />
        </div>
        <p className="mt-0.5 text-sm text-muted">
          <time dateTime={t.date}>{formatDate(t.date, 'd MMM yyyy')}</time> · {paymentMethodLabel(t.method, PAYMENT_METHOD_META[t.method].label)} ·{' '}
          <Link to={subjectPath(t.subject)} className="font-semibold text-pine hover:underline">
            {t.description}
          </Link>
        </p>
        <p className="mt-1 break-all font-mono text-xs text-muted">{tr('tx.ref', { reference: t.reference })}</p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <div className="sm:text-right">
          <Price amount={t.amount} className={`text-lg font-extrabold ${t.status === TRANSACTION_STATUS.Failed ? 'text-muted line-through' : 'text-ink'}`} />
          {partRefund && <p className="text-xs text-muted">{tr('tx.refundedAmount', { amount: formatNaira(t.refunded) })}</p>}
        </div>
        <div className="flex items-center gap-2">
          {t.hasReceipt &&
          <Button
            variant="outline"
            size="sm"
            icon={DownloadIcon}
            loading={downloading}
            onClick={() => onDownload(t.reference)}
            aria-label={t.status === TRANSACTION_STATUS.Refunded && !partRefund ? tr('tx.downloadRefund', { reference: t.reference }) : tr('tx.downloadReceipt', { reference: t.reference })}>

              {tr('tx.pdf')}
            </Button>
          }
          <Link
            to={PAYMENT_ROUTES.transaction(t.reference)}
            aria-label={tr('tx.details', { reference: t.reference })}
            className="rounded-lg p-2 text-muted hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>);

}
