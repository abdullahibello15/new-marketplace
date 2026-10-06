import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '../../../../components/ui/Badge';
import { Price } from '../../../../components/ui/Price';
import { PAYMENT_SUBJECT } from '../../../payments/constants';
import { DASHBOARD_ROUTES, INVOICE_KIND_LABELS, INVOICE_STATUS, INVOICE_STATUS_META } from '../../constants';
import { planById } from '../../plans';
import { invoiceMethodLabel } from '../../utils/invoiceReceipt';
import type { Invoice } from '../../types';

const linkClass = 'rounded font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40';

/** Billing history: date, plan, amount, method, status and reference, with a receipt (or Pay) link per invoice. */
export function InvoiceTable({ invoices }: {invoices: Invoice[];}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Subscription invoices, newest first</caption>
        <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Plan</th>
            <th scope="col" className="px-4 py-3 text-right">Amount</th>
            <th scope="col" className="px-4 py-3">Method</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Reference</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {invoices.map((inv) => {
            const status = INVOICE_STATUS_META[inv.status];
            return (
              <tr key={inv.id}>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{format(new Date(inv.paidAt ?? inv.createdAt), 'd MMM yyyy')}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-ink">{planById(inv.planId).name}</p>
                  <p className="text-muted">{INVOICE_KIND_LABELS[inv.kind]}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Price amount={inv.amount} className="font-bold text-ink" />
                </td>
                <td className="px-4 py-3 text-ink">{invoiceMethodLabel(inv)}</td>
                <td className="px-4 py-3">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{inv.paymentReference ?? inv.id}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {inv.status === INVOICE_STATUS.Paid &&
                  <Link to={DASHBOARD_ROUTES.invoice(inv.id)} className={linkClass}>
                      View receipt<span className="sr-only"> for {inv.id}</span>
                    </Link>
                  }
                  {inv.status === INVOICE_STATUS.Open &&
                  <Link to={DASHBOARD_ROUTES.pay(PAYMENT_SUBJECT.Subscription, inv.id)} className={linkClass}>
                      Pay now<span className="sr-only"> for {inv.id}</span>
                    </Link>
                  }
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
