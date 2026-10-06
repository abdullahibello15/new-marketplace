import { format } from 'date-fns';
import { Price } from '../../../../components/ui/Price';
import { formatNaira } from '../../../../utils/format';
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
  return (
    <details open={open} className="group text-sm">
      <summary className="cursor-pointer rounded font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
        Escrow history ({escrow.ledger.length})
      </summary>
      <ol className="mt-2 space-y-2 border-l-2 border-line pl-3" aria-label="Escrow ledger">
        {escrow.ledger.map((e) =>
        <li key={e.id}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold text-ink">{ESCROW_EVENT_LABELS[e.type]}</span>
              <Price amount={e.amount} className="text-ink" />
            </p>
            <p className="text-xs text-muted">
              <time dateTime={e.at}>{format(new Date(e.at), 'd MMM yyyy, h:mm a')}</time>
              {e.note && ` · ${e.note}`}
            </p>
            {showCommission && e.type === ESCROW_EVENT.Released &&
          <p className="text-xs text-muted">
                Commission {formatNaira(e.commission)} · you get {formatNaira(e.amount - e.commission)}
                {e.paidOutAt ? ` · paid out ${format(new Date(e.paidOutAt), 'd MMM')}` : ' · available'}
              </p>
          }
          </li>
        )}
      </ol>
    </details>);

}
