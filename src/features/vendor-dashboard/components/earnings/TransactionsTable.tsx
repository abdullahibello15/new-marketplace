import { format } from 'date-fns';
import { Badge } from '../../../../components/ui/Badge';
import { formatNaira } from '../../../../utils/format';
import { PAYOUT_STATUS_META, PLATFORM_FEE_RATE } from '../../constants';
import type { CompletedTransaction } from '../../types';

export function TransactionsTable({ transactions }: {transactions: CompletedTransaction[];}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Recent completed jobs. Amounts are what you receive after the {Math.round(PLATFORM_FEE_RATE * 100)}% platform fee.
        </caption>
        <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">Date</th>
            <th scope="col" className="px-4 py-3 font-bold">Job</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">You get</th>
            <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">Payout</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {transactions.map((t) => {
            const payout = PAYOUT_STATUS_META[t.payoutStatus];
            return (
              <tr key={t.id}>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{format(new Date(t.completedAt), 'd MMM')}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">{t.item}</p>
                  <p className="text-muted">{t.customerName}</p>
                  {/* On phones the payout column is hidden, so show its badge here. */}
                  <Badge tone={payout.tone} className="mt-1 sm:hidden">{payout.label}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <p className="font-bold text-ink">{formatNaira(t.netAmount)}</p>
                  <p className="text-xs text-muted">of {formatNaira(t.grossAmount)}</p>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge tone={payout.tone}>{payout.label}</Badge>
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
