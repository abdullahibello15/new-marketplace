import { format } from 'date-fns';
import { formatNaira } from '../../../utils/format';
import { PAYMENT_METHOD_META } from '../../payments/constants';
import { escapeHtml } from '../../payments/utils/receipt';
import { INVOICE_KIND_LABELS, INVOICE_STATUS_META } from '../constants';
import { planById } from '../plans';
import type { Invoice } from '../types';

const day = (iso: string) => format(new Date(iso), 'd MMM yyyy');

/** "Card", "Bank transfer"… or a dash while unpaid. */
export const invoiceMethodLabel = (invoice: Invoice) => invoice.method ? PAYMENT_METHOD_META[invoice.method].label : '—';

/** A standalone HTML receipt for "Download". Every value is escaped. */
export function invoiceReceiptHtml(invoice: Invoice, vendorName: string): string {
  const rows = invoice.lines.
  map((l) => `<tr><td>${escapeHtml(l.label)}</td><td style="text-align:right">${escapeHtml(l.amount < 0 ? `−${formatNaira(-l.amount)}` : formatNaira(l.amount))}</td></tr>`).
  join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.id)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:24px auto;color:#1f2a24}td{padding:4px 0}table{width:100%;border-collapse:collapse}.t td{border-top:1px solid #ccc;font-weight:700}</style></head><body>
<h1>Gwani subscription receipt</h1>
<p><strong>Invoice:</strong> ${escapeHtml(invoice.id)}<br><strong>Status:</strong> ${escapeHtml(INVOICE_STATUS_META[invoice.status].label)}<br><strong>Paid:</strong> ${escapeHtml(invoice.paidAt ? day(invoice.paidAt) : '—')}<br><strong>Reference:</strong> ${escapeHtml(invoice.paymentReference ?? '—')}</p>
<p><strong>Billed to:</strong> ${escapeHtml(vendorName)}<br><strong>Plan:</strong> ${escapeHtml(planById(invoice.planId).name)} · ${escapeHtml(INVOICE_KIND_LABELS[invoice.kind])}<br><strong>Period:</strong> ${escapeHtml(`${day(invoice.periodStart)} – ${day(invoice.periodEnd)}`)}<br><strong>Method:</strong> ${escapeHtml(invoiceMethodLabel(invoice))}</p>
<table>${rows}<tr class="t"><td>Total</td><td style="text-align:right">${escapeHtml(formatNaira(invoice.amount))}</td></tr></table>
</body></html>`;
}

export function downloadInvoiceReceipt(invoice: Invoice, vendorName: string): void {
  const url = URL.createObjectURL(new Blob([invoiceReceiptHtml(invoice, vendorName)], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `gwani-invoice-${invoice.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
