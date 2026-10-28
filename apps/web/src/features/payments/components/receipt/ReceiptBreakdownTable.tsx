import { useTranslation } from 'react-i18next';
import { Price } from '../../../../components/ui/Price';
import { MONEY_CLASS } from '../../../../components/ui/moneyStyles';
import { formatSignedNaira } from '../../utils/receiptData';
import type { ReceiptBreakdown, ReceiptCommission } from '../../types';

interface ReceiptBreakdownTableProps {
  breakdown: ReceiptBreakdown;
  /** Vendor copies: commission and what the vendor receives. */
  commission?: ReceiptCommission | null;
  /** "Service" for jobs, "Items" for orders. */
  itemsLabel: string;
}

interface RowProps {
  label: string;
  amount: number;
  strong?: boolean;
  muted?: boolean;
  /** Shown as −₦… (refunds, commission). */
  negative?: boolean;
  divider?: boolean;
}

function Row({ label, amount, strong = false, muted = false, negative = false, divider = false }: RowProps) {
  const tone = muted ? 'text-muted' : 'text-ink';
  return (
    <tr className={divider ? 'border-t border-line' : undefined}>
      <th scope="row" className={`py-1 pr-3 text-left ${strong ? 'pt-2 font-bold text-ink' : `font-normal ${tone}`}`}>
        {label}
      </th>
      <td className={`py-1 text-right ${strong ? 'pt-2' : ''}`}>
        {negative ?
        <span className={`${MONEY_CLASS} ${tone}`}>{formatSignedNaira(-amount)}</span> :
        <Price amount={amount} className={strong ? 'text-lg font-extrabold text-ink' : tone} />}
      </td>
    </tr>);

}

function Group({ title }: {title: string;}) {
  return (
    <tr>
      <th colSpan={2} scope="colgroup" className="pb-1 pt-3 text-left text-xs font-bold uppercase tracking-wider text-muted">
        {title}
      </th>
    </tr>);

}

/** The money on a receipt: items, delivery, total paid, any fee kept, refunds, and (vendors) commission. */
export function ReceiptBreakdownTable({ breakdown: b, commission, itemsLabel }: ReceiptBreakdownTableProps) {
  const { t } = useTranslation('payments');
  const pct = commission ? `${Math.round(commission.rate * 1000) / 10}%` : '';
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t('receipt.noteBreakdown')}</caption>
      <tbody>
        <Group title={itemsLabel} />
        {b.items.map((l, i) =>
        <Row key={`${l.label}-${i}`} label={l.label} amount={l.amount} />
        )}
        {b.deliveryFee > 0 && <Row label={t('receipt.deliveryFee')} amount={b.deliveryFee} />}
        <Row label={t('receipt.totalPaid')} amount={b.total} strong divider />

        {b.fees.length > 0 &&
        <>
            <Group title={t('receipt.fees')} />
            {b.fees.map((l) =>
          <Row key={l.label} label={l.label} amount={l.amount} muted />
          )}
          </>
        }

        {b.refunds.length > 0 &&
        <>
            <Group title={t('receipt.refunds')} />
            {b.refunds.map((l, i) =>
          <Row key={`${l.label}-${i}`} label={l.label} amount={l.amount} negative />
          )}
            <Row label={t('receipt.afterRefunds')} amount={b.netPaid} strong divider />
          </>
        }

        {commission &&
        <>
            <Group title={commission.estimated ? t('receipt.earningsEstimated') : t('receipt.earnings')} />
            <Row label={t('receipt.commission', { percent: pct })} amount={commission.amount} negative />
            <Row label={t('receipt.youReceive')} amount={commission.vendorNet} strong divider />
          </>
        }
      </tbody>
    </table>);

}
