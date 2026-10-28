import { format } from 'date-fns';
import { Badge } from '../../../components/ui/Badge';
import { MONEY_CLASS } from '../../../components/ui/moneyStyles';
import { Price } from '../../../components/ui/Price';
import { formatSignedNaira } from '../../../utils/format';
import { LEDGER_ENTRY_TYPE_META } from '../constants';
import type { Investment, LedgerRow } from '../types';

interface LedgerTableProps {
  /** In display order (newest first). */
  rows: LedgerRow[];
  investments: readonly Investment[];
}

/** Read-only ledger: date, type, description, signed amount and the balance after each entry. */
export function LedgerTable({ rows, investments }: LedgerTableProps) {
  const nameOf = (id: string) => investments.find((i) => i.id === id)?.name ?? id;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Ledger entries, newest first. Balance is your capital plus dividends not yet paid out.</caption>
        <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3">Description</th>
            <th scope="col" className="px-4 py-3 text-right">Amount</th>
            <th scope="col" className="px-4 py-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ entry: e, balance }) => {
            const meta = LEDGER_ENTRY_TYPE_META[e.type];
            return (
              <tr key={e.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  <time dateTime={e.date}>{format(new Date(e.date), 'd MMM yyyy')}</time>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{e.description}</p>
                  <p className="text-xs text-muted">{nameOf(e.investmentId)}</p>
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${MONEY_CLASS} ${e.amount < 0 ? 'text-clay-dark' : 'text-ink'}`}>
                  {e.amount > 0 ? '+' : ''}
                  {formatSignedNaira(e.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Price amount={balance} className="text-muted" />
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
