import { format } from 'date-fns';
import { Price } from '../../../../components/ui/Price';
import { methodDetail } from '../../utils/receipt';
import { PaymentOutcome } from '../PaymentOutcome';
import { PaymentStatusBadge } from '../PaymentStatusBadge';
import type { Receipt } from '../../types';

/** The receipt itself. Plain layout so it prints cleanly on A4 or a receipt printer. */
export function ReceiptView({ receipt }: {receipt: Receipt;}) {
  const p = receipt.payment;
  return (
    <article aria-labelledby="receipt-heading" className="rounded-2xl border border-line bg-white p-5 print:border-0 print:p-0 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="receipt-heading" className="text-lg font-extrabold text-ink">
            Payment receipt
          </h2>
          <p className="text-sm text-muted">{format(new Date(receipt.issuedAt), 'd MMMM yyyy, h:mm a')}</p>
        </div>
        <PaymentStatusBadge status={p.status} />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Reference</p>
      <p className="select-all break-all font-mono text-xl font-bold text-ink">{p.reference}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Paid to</dt>
          <dd className="font-semibold text-ink">{p.vendorName}</dd>
        </div>
        <div>
          <dt className="text-muted">Paid by</dt>
          <dd className="font-semibold text-ink">{p.customerName}</dd>
        </div>
        <div>
          <dt className="text-muted">For</dt>
          <dd className="font-semibold text-ink">{p.description}</dd>
        </div>
        <div>
          <dt className="text-muted">Method</dt>
          <dd className="font-semibold text-ink">{methodDetail(receipt)}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">What was paid for</caption>
        <tbody>
          {receipt.lines.map((l) =>
          <tr key={l.label}>
              <th scope="row" className="py-1 text-left font-normal text-muted">
                {l.label}
              </th>
              <td className="py-1 text-right">
                <Price amount={l.amount} className="text-ink" />
              </td>
            </tr>
          )}
          <tr className="border-t border-line">
            <th scope="row" className="pt-2 text-left font-bold text-ink">
              Total paid
            </th>
            <td className="pt-2 text-right">
              <Price amount={p.amount} className="text-lg font-extrabold text-ink" />
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-4">
        <PaymentOutcome payment={p} />
      </div>
    </article>);

}
