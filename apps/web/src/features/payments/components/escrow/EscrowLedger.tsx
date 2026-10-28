import { useTranslation } from 'react-i18next';
import { escrowEventLabel } from '../../../../i18n/labels';
import { Price } from '../../../../components/ui/Price';
import { formatDate, formatNaira } from '../../../../utils/format';
import { ESCROW_EVENT, ESCROW_EVENT_LABELS } from '../../constants';
import type { Escrow } from '../../types';

interface EscrowLedgerProps {
  escrow: Pick<Escrow, 'ledger'>;
  /** Vendors also see the commission and net on each release. */
  showCommission?: boolean;
  /** Start expanded (e.g. inside an already-expanded table row). */
  open?: boolean;
}

/** The escrow ledger: every held / released / refunded / paid-out event with its time. Collapsible to keep pages short. */
export function EscrowLedger({ escrow, showCommission = false, open = false }: EscrowLedgerProps) {
  const { t } = useTranslation('payments');
  return (
    <details open={open} className="group text-sm">
      <summary className="cursor-pointer rounded font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
        {t('escrow.history', { count: escrow.ledger.length })}
      </summary>
      <ol className="mt-2 space-y-2 border-l-2 border-line pl-3" aria-label={t('escrow.ledger')}>
        {escrow.ledger.map((e) =>
        <li key={e.id}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold text-ink">{escrowEventLabel(e.type, ESCROW_EVENT_LABELS[e.type])}</span>
              <Price amount={e.amount} className="text-ink" />
            </p>
            <p className="text-xs text-muted">
              <time dateTime={e.at}>{formatDate(e.at, 'd MMM yyyy, h:mm a')}</time>
              {e.note && ` · ${e.note}`}
            </p>
            {showCommission && e.type === ESCROW_EVENT.Released &&
          <p className="text-xs text-muted">
                {t('escrow.commission', { commission: formatNaira(e.commission), net: formatNaira(e.amount - e.commission) })}
                {e.paidOutAt ? t('escrow.paidOut', { date: formatDate(e.paidOutAt, 'd MMM') }) : t('escrow.available')}
              </p>
          }
          </li>
        )}
      </ol>
    </details>);

}
