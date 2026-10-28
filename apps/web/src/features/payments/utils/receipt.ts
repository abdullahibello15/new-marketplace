/*
 * Customer and vendor payment receipts are built in receiptData.ts and drawn as PDFs by receiptPdf.ts.
 * This file keeps the HTML escaping still used by the vendor's subscription invoice download.
 */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
