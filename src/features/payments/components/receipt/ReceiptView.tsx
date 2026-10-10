import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { PAYMENT_SUBJECT } from '../../constants';
import { TransactionStatusBadge } from '../transactions/TransactionStatusBadge';
import { ReceiptBreakdownTable } from './ReceiptBreakdownTable';
import type { ReceiptDocument } from '../../types';

const when = (iso: string) => formatDate(iso, 'd MMMM yyyy, h:mm a');

function Detail({ label, children }: {label: string;children: ReactNode;}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>);

}

/**
 * The receipt (or refund note) itself, for customers and vendors alike: the same ReceiptDocument the PDF
 * draws. Plain layout so it prints cleanly on A4 or a receipt printer.
 */
export function ReceiptView({ receipt: d }: {receipt: ReceiptDocument;}) {
  const { t } = useTranslation('payments');
  const business = [d.vendor.trade, d.vendor.location].filter(Boolean).join(' · ');
  return (
    <article aria-labelledby="receipt-heading" className="rounded-2xl border border-line bg-white p-5 print:border-0 print:p-0 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-pine pb-4">
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-pine">{d.platform.name}</p>
          <p className="text-xs text-muted">
            {d.platform.address} · {d.platform.website} · {d.platform.email}
          </p>
        </div>
        <div className="text-right">
          <h2 id="receipt-heading" className="text-lg font-extrabold text-ink">
            {d.title}
          </h2>
          <p className="text-xs text-muted">{d.viewer === 'vendor' ? t('receipt.vendorCopy') : t('receipt.customerCopy')}</p>
        </div>
      </header>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Detail label={d.kind === 'refund_note' ? t('receipt.refundNumber') : t('receipt.receiptNumber')}>
          <span className="select-all font-mono">{d.receiptNumber}</span>
        </Detail>
        <Detail label={t('receipt.date')}>{when(d.issuedAt)}</Detail>
        <Detail label={t('receipt.reference')}>
          <span className="select-all break-all font-mono">{d.reference}</span>
        </Detail>
        <Detail label={t('receipt.status')}>
          <TransactionStatusBadge status={d.status} />
        </Detail>
        <Detail label={t('receipt.method')}>{d.methodLabel}</Detail>
        <Detail label={t('receipt.paidOn')}>{d.paidAt ? when(d.paidAt) : t('receipt.notPaid')}</Detail>
      </dl>

      <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
        <Detail label={t('receipt.customer')}>{d.customerName}</Detail>
        <Detail label={t('receipt.vendor')}>
          {d.vendor.name}
          {business && <span className="block text-xs font-normal text-muted">{business}</span>}
        </Detail>
        <Detail label={t('receipt.for')}>{d.description}</Detail>
      </dl>

      <div className="mt-4 border-t border-line pt-2">
        <ReceiptBreakdownTable breakdown={d.breakdown} commission={d.commission} itemsLabel={d.subject.kind === PAYMENT_SUBJECT.Job ? t('receipt.service') : t('receipt.items')} />
      </div>

      {d.notes.length > 0 &&
      <ul className="mt-4 space-y-1 text-sm text-muted">
          {d.notes.map((n) =>
        <li key={n}>{n}</li>
        )}
        </ul>
      }

      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
        {t('receipt.issued', { name: d.platform.name })}
      </p>
    </article>);

}
