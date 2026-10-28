import i18n from '../../../i18n';
import { invoiceKindLabel, invoiceStatusLabel, paymentMethodLabel, planName } from '../../../i18n/labels';
import { formatDate, formatNaira } from '../../../utils/format';
import { PAYMENT_METHOD_META } from '../../payments/constants';
import { escapeHtml } from '../../payments/utils/receipt';
import { INVOICE_KIND_LABELS, INVOICE_STATUS_META } from '../constants';
import { planById } from '../plans';
import type { Invoice } from '../types';
import { translate } from '../../../i18n/message';

const day = (iso: string) => formatDate(iso, 'd MMM yyyy');

/** "Card", "Bank transfer"… or a dash while unpaid. */
export const invoiceMethodLabel = (invoice: Invoice) => invoice.method ? paymentMethodLabel(invoice.method, PAYMENT_METHOD_META[invoice.method].label) : '—';

/** A standalone HTML receipt for "Download". Every value is escaped. */
export function invoiceReceiptHtml(invoice: Invoice, vendorName: string): string {
  const rows = invoice.lines.
  map((l) => `<tr><td>${escapeHtml(translate(l.label))}</td><td style="text-align:right">${escapeHtml(l.amount < 0 ? `−${formatNaira(-l.amount)}` : formatNaira(l.amount))}</td></tr>`).
  join('');
  const t = (key: string, options?: Record<string, unknown>) => escapeHtml(i18n.t(`vendor:subscription.receipt.${key}`, options));
  const plan = planById(invoice.planId);
  return `<!doctype html><html lang="${escapeHtml(document.documentElement.lang || 'en')}"><head><meta charset="utf-8"><title>${t('invoiceTitle', { id: invoice.id })}</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:24px auto;color:#1f2a24}td{padding:4px 0}table{width:100%;border-collapse:collapse}.t td{border-top:1px solid #ccc;font-weight:700}</style></head><body>
<h1>${t('heading')}</h1>
<p><strong>${t('invoice')}:</strong> ${escapeHtml(invoice.id)}<br><strong>${t('status')}:</strong> ${escapeHtml(invoiceStatusLabel(invoice.status, INVOICE_STATUS_META[invoice.status].label))}<br><strong>${t('paid')}:</strong> ${escapeHtml(invoice.paidAt ? day(invoice.paidAt) : '—')}<br><strong>${t('reference')}:</strong> ${escapeHtml(invoice.paymentReference ?? '—')}</p>
<p><strong>${t('billedTo')}:</strong> ${escapeHtml(vendorName)}<br><strong>${t('plan')}:</strong> ${escapeHtml(planName(plan.id, plan.name))} · ${escapeHtml(invoiceKindLabel(invoice.kind, INVOICE_KIND_LABELS[invoice.kind]))}<br><strong>${t('period')}:</strong> ${escapeHtml(`${day(invoice.periodStart)} – ${day(invoice.periodEnd)}`)}<br><strong>${t('method')}:</strong> ${escapeHtml(invoiceMethodLabel(invoice))}</p>
<table>${rows}<tr class="t"><td>${t('total')}</td><td style="text-align:right">${escapeHtml(formatNaira(invoice.amount))}</td></tr></table>
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
