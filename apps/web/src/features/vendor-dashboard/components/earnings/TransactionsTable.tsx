import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { earningStageLabel } from '../../../../i18n/labels';
import { ReceiptTextIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { formatDate, formatNaira } from '../../../../utils/format';
import { ESCROW_CONFIG } from '../../../payments/escrow/escrowConfig';
import { EscrowLedger } from '../../../payments/components/escrow/EscrowLedger';
import { PAYMENT_ROUTES } from '../../../payments/constants';
import { EARNING_STAGE, EARNING_STAGE_META } from '../../constants';
import type { CompletedTransaction } from '../../types';

const commissionPercent = Math.round(ESCROW_CONFIG.commissionRate * 100);

/** Recent transactions with the breakdown (paid in, commission, you get) and each one's escrow ledger. */
export function TransactionsTable({ transactions }: {transactions: CompletedTransaction[];}) {
  const { t } = useTranslation('vendor');
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          {t('earnings.caption', { percent: commissionPercent })}
        </caption>
        <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">{t('earnings.date')}</th>
            <th scope="col" className="px-4 py-3 font-bold">{t('earnings.item')}</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">{t('earnings.youGet')}</th>
            <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">{t('earnings.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {transactions.map((tx) => {
            const stage = EARNING_STAGE_META[tx.stage];
            const stageLabel = earningStageLabel(tx.stage, stage.label);
            const refunded = tx.stage === EARNING_STAGE.Refunded;
            return (
              <tr key={tx.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(tx.completedAt, 'd MMM')}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">{tx.item}</p>
                  <p className="text-muted">{tx.customerName}</p>
                  {/* On phones the status column is hidden, so show its badge here. */}
                  <Badge tone={stage.tone} className="mt-1 sm:hidden">
                    {stageLabel}
                  </Badge>
                  <div className="mt-1.5">
                    {tx.ledger.length > 0 ?
                    <EscrowLedger escrow={tx} showCommission /> :
                    <p className="text-xs text-muted">{t('earnings.beforeEscrow')}</p>
                    }
                    {/* Escrow-backed rows are real payments (id = payment reference): same receipt as the customer's, with commission. */}
                    {tx.ledger.length > 0 &&
                    <Link
                      to={PAYMENT_ROUTES.vendorReceipt(tx.id)}
                      className="mt-1 inline-flex items-center gap-1 rounded text-xs font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                        <ReceiptTextIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('earnings.receipt')}
                      </Link>
                    }
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <p className={`font-bold ${refunded ? 'text-muted line-through' : 'text-ink'}`}>{formatNaira(tx.netAmount)}</p>
                  <p className="text-xs text-muted">{t('earnings.of', { amount: formatNaira(tx.grossAmount) })}</p>
                  {!refunded && <p className="text-xs text-muted">{t('earnings.commission', { amount: formatNaira(tx.commission) })}</p>}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge tone={stage.tone}>{stageLabel}</Badge>
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
