import { format } from 'date-fns';
import { formatNaira } from '../../../utils/format';
import { PAYMENT_METHOD_META, PAYMENT_STATUS_META } from '../constants';
import type { Receipt } from '../types';

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** How the money moved, for the receipt. Bank and code only; never card or account details of the payer. */
export function methodDetail(r: Receipt): string {
  const p = r.payment;
  if (p.transfer) return `${PAYMENT_METHOD_META.transfer.label} to ${p.transfer.bankName}`;
  if (p.ussd) return `${PAYMENT_METHOD_META.ussd.label} (${p.ussd.bankName})`;
  if (p.cash) return `${PAYMENT_METHOD_META.cash.label}, confirmed by both sides`;
  return PAYMENT_METHOD_META[p.method].label;
}

/** A standalone HTML receipt for "Download". All values are escaped. */
export function receiptHtml(r: Receipt): string {
  const p = r.payment;
  const rows = r.lines.map((l) => `<tr><td>${escapeHtml(l.label)}</td><td style="text-align:right">${escapeHtml(formatNaira(l.amount))}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(p.reference)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:24px auto;color:#1f2a24}td{padding:4px 0}table{width:100%;border-collapse:collapse}.t td{border-top:1px solid #ccc;font-weight:700}</style></head><body>
<h1>Gwani payment receipt</h1>
<p><strong>Reference:</strong> ${escapeHtml(p.reference)}<br><strong>Status:</strong> ${escapeHtml(PAYMENT_STATUS_META[p.status].label)}<br><strong>Date:</strong> ${escapeHtml(format(new Date(r.issuedAt), 'd MMM yyyy, h:mm a'))}</p>
<p><strong>Paid to:</strong> ${escapeHtml(p.vendorName)}<br><strong>Paid by:</strong> ${escapeHtml(p.customerName)}<br><strong>For:</strong> ${escapeHtml(p.description)}<br><strong>Method:</strong> ${escapeHtml(methodDetail(r))}</p>
<table>${rows}<tr class="t"><td>Total</td><td style="text-align:right">${escapeHtml(formatNaira(p.amount))}</td></tr></table>
${p.outcome ? `<p>${escapeHtml(p.outcome)}</p>` : ''}
</body></html>`;
}

/** Saves the receipt as an HTML file the customer can open or print later. */
export function downloadReceipt(r: Receipt): void {
  const url = URL.createObjectURL(new Blob([receiptHtml(r)], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `gwani-receipt-${r.payment.reference}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
