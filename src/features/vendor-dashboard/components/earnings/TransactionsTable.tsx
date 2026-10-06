import { format } from 'date-fns';
import { Badge } from '../../../../components/ui/Badge';
import { formatNaira } from '../../../../utils/format';
import { ESCROW_CONFIG } from '../../../payments/escrow/escrowConfig';
import { EscrowLedger } from '../../../payments/components/escrow/EscrowLedger';
import { EARNING_STAGE, EARNING_STAGE_META } from '../../constants';
import type { CompletedTransaction } from '../../types';

const commissionPercent = Math.round(ESCROW_CONFIG.commissionRate * 100);

/** Recent transactions with the breakdown (paid in, commission, you get) and each one's escrow ledger. */
export function TransactionsTable({ transactions }: {transactions: CompletedTransaction[];}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Recent transactions. “You get” is after the {commissionPercent}% platform commission, taken when escrow releases the money.
        </caption>
        <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">Date</th>
            <th scope="col" className="px-4 py-3 font-bold">Job or order</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">You get</th>
            <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {transactions.map((t) => {
            const stage = EARNING_STAGE_META[t.stage];
            const refunded = t.stage === EARNING_STAGE.Refunded;
            return (
              <tr key={t.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{format(new Date(t.completedAt), 'd MMM')}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">{t.item}</p>
                  <p className="text-muted">{t.customerName}</p>
                  {/* On phones the status column is hidden, so show its badge here. */}
                  <Badge tone={stage.tone} className="mt-1 sm:hidden">
                    {stage.label}
                  </Badge>
                  <div className="mt-1.5">
                    {t.ledger.length > 0 ?
                    <EscrowLedger escrow={t} showCommission /> :
                    <p className="text-xs text-muted">From before escrow</p>
                    }
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <p className={`font-bold ${refunded ? 'text-muted line-through' : 'text-ink'}`}>{formatNaira(t.netAmount)}</p>
                  <p className="text-xs text-muted">of {formatNaira(t.grossAmount)}</p>
                  {!refunded && <p className="text-xs text-muted">−{formatNaira(t.commission)} commission</p>}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge tone={stage.tone}>{stage.label}</Badge>
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
