import { useTranslation } from 'react-i18next';
import { Price } from '../../../../components/ui/Price';
import { formatNaira } from '../../../../utils/format';
import type { TransactionSummary } from '../../types';

function Tile({ label, amount, note }: {label: string;amount: number;note?: string;}) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3.5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <Price amount={amount} className="mt-0.5 block text-2xl font-extrabold text-ink" />
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>);

}

/** Spent this month (after refunds), still pending, and refunded. */
export function TransactionSummaryCards({ summary }: {summary: TransactionSummary;}) {
  const { t } = useTranslation('payments');
  return (
    <section aria-label={t('tx.summary')} className="grid gap-3 sm:grid-cols-3">
      <Tile
        label={t('tx.spent')}
        amount={summary.spentThisMonth}
        note={summary.heldInEscrow ? t('tx.heldNote', { amount: formatNaira(summary.heldInEscrow) }) : t('tx.afterRefunds')} />

      <Tile label={t('tx.pending')} amount={summary.pending} note={t('tx.pendingNote')} />
      <Tile label={t('tx.refunded')} amount={summary.refunded} note={t('tx.refundedNote')} />
    </section>);

}
