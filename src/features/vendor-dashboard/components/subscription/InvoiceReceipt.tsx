import { format } from 'date-fns';
import { Badge } from '../../../../components/ui/Badge';
import { Price } from '../../../../components/ui/Price';
import { INVOICE_KIND_LABELS, INVOICE_STATUS_META } from '../../constants';
import { planById } from '../../plans';
import { invoiceMethodLabel } from '../../utils/invoiceReceipt';
import type { Invoice } from '../../types';

const day = (iso: string) => format(new Date(iso), 'd MMM yyyy');

/** A subscription invoice as a receipt. Plain layout so it prints cleanly. */
export function InvoiceReceipt({ invoice, vendorName }: {invoice: Invoice;vendorName: string;}) {
  const status = INVOICE_STATUS_META[invoice.status];
  return (
    <article aria-labelledby="invoice-heading" className="rounded-2xl border border-line bg-white p-5 print:border-0 print:p-0 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="invoice-heading" className="text-lg font-extrabold text-ink">Subscription receipt</h2>
          <p className="text-sm text-muted">{invoice.paidAt ? `Paid ${format(new Date(invoice.paidAt), 'd MMMM yyyy, h:mm a')}` : 'Not paid yet'}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Payment reference</p>
      <p className="select-all break-all font-mono text-xl font-bold text-ink">{invoice.paymentReference ?? '—'}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Invoice</dt>
          <dd className="font-semibold text-ink">{invoice.id}</dd>
        </div>
        <div>
          <dt className="text-muted">Billed to</dt>
          <dd className="font-semibold text-ink">{vendorName}</dd>
        </div>
        <div>
          <dt className="text-muted">Plan</dt>
          <dd className="font-semibold text-ink">
            {planById(invoice.planId).name} · {INVOICE_KIND_LABELS[invoice.kind]}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Period</dt>
          <dd className="font-semibold text-ink">
            {day(invoice.periodStart)} – {day(invoice.periodEnd)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Method</dt>
          <dd className="font-semibold text-ink">{invoiceMethodLabel(invoice)}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Charges</caption>
        <tbody>
          {invoice.lines.map((l) =>
          <tr key={l.label}>
              <th scope="row" className="py-1 text-left font-normal text-muted">{l.label}</th>
              <td className="py-1 text-right text-ink">
                {l.amount < 0 && '−'}
                <Price amount={Math.abs(l.amount)} />
              </td>
            </tr>
          )}
          <tr className="border-t border-line">
            <th scope="row" className="pt-2 text-left font-bold text-ink">Total</th>
            <td className="pt-2 text-right">
              <Price amount={invoice.amount} className="text-lg font-extrabold text-ink" />
            </td>
          </tr>
        </tbody>
      </table>
    </article>);

}
