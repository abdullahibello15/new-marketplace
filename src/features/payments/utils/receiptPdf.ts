import i18n from '../../../i18n';
import { transactionStatusLabel } from '../../../i18n/labels';
import { formatDate } from '../../../utils/format';
import notoBoldUrl from '@expo-google-fonts/noto-sans/700Bold/NotoSans_700Bold.ttf?url';
import notoRegularUrl from '@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf?url';
import { PAYMENT_SUBJECT, TRANSACTION_STATUS_META } from '../constants';
import { formatSignedNaira } from './receiptData';
import type { jsPDF } from 'jspdf';
import type { ReceiptDocument } from '../types';

/*
 * Receipt PDFs, generated in the browser with jsPDF. Text uses Noto Sans (embedded), because jsPDF's
 * built-in fonts have no ₦ glyph. This file and jsPDF are only loaded when someone downloads a receipt
 * (see useReceiptDownload), so they never weigh on page loads. Draws the same ReceiptDocument as
 * ReceiptView: one receipt per page.
 */

const FONT = 'NotoSans';
const A4 = { width: 210, height: 297 };
const M = 18;
const CONTENT = A4.width - M * 2;
const COLOR = { ink: '#1C1B18', muted: '#6B665B', pine: '#1F4B4D', line: '#E7DECB' } as const;

export interface PdfFonts {
  /** Base64 TTF data. */
  regular: string;
  bold: string;
}

/** Registers the embedded Noto Sans (Identity-H, so ₦ and other Unicode characters render). */
export function registerFonts(pdf: jsPDF, fonts: PdfFonts): void {
  pdf.addFileToVFS('NotoSans-Regular.ttf', fonts.regular);
  pdf.addFont('NotoSans-Regular.ttf', FONT, 'normal', undefined, 'Identity-H');
  pdf.addFileToVFS('NotoSans-Bold.ttf', fonts.bold);
  pdf.addFont('NotoSans-Bold.ttf', FONT, 'bold', undefined, 'Identity-H');
}

interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: string;
  x?: number;
  align?: 'left' | 'right';
  width?: number;
  /** Space after the text, in mm. */
  gap?: number;
}

/** Draws top to bottom, starting a new page when the next block wouldn't fit. */
class Cursor {
  y = M;
  constructor(private readonly pdf: jsPDF) {}

  ensure(height: number) {
    if (this.y + height > A4.height - M) {
      this.pdf.addPage();
      this.y = M;
    }
  }

  text(value: string, { size = 10, bold = false, color = COLOR.ink, x = M, align = 'left', width = CONTENT, gap = 1.5 }: TextOptions = {}) {
    const pdf = this.pdf;
    pdf.setFont(FONT, bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    const lines: string[] = pdf.splitTextToSize(value, width);
    const lineHeight = size * 0.45;
    this.ensure(lines.length * lineHeight);
    pdf.text(lines, align === 'right' ? x + width : x, this.y + lineHeight * 0.8, { align });
    this.y += lines.length * lineHeight + gap;
  }

  /** A label on the left and an amount on the right, wrapping the label if it's long. */
  row(label: string, amount: string, { bold = false, color = COLOR.ink, size = 10 }: Pick<TextOptions, 'bold' | 'color' | 'size'> = {}) {
    const pdf = this.pdf;
    pdf.setFont(FONT, bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    const lines: string[] = pdf.splitTextToSize(label, CONTENT - 45);
    const lineHeight = size * 0.45;
    this.ensure(lines.length * lineHeight + 2);
    pdf.text(lines, M, this.y + lineHeight * 0.8);
    pdf.text(amount, M + CONTENT, this.y + lineHeight * 0.8, { align: 'right' });
    this.y += lines.length * lineHeight + 2;
  }

  /** Two label/value pairs side by side. */
  pairs(items: [string, string][]) {
    const half = CONTENT / 2 - 4;
    for (let i = 0; i < items.length; i += 2) {
      const start = this.y;
      let end = start;
      items.slice(i, i + 2).forEach(([label, value], col) => {
        this.y = start;
        this.text(label, { size: 8, color: COLOR.muted, x: M + col * (half + 8), width: half, gap: 0.5 });
        this.text(value, { size: 10, bold: true, x: M + col * (half + 8), width: half, gap: 3 });
        end = Math.max(end, this.y);
      });
      this.y = end;
    }
  }

  rule(color: string = COLOR.line, gap = 4) {
    this.ensure(gap * 2);
    this.y += gap / 2;
    this.pdf.setDrawColor(color);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(M, this.y, M + CONTENT, this.y);
    this.y += gap;
  }

  heading(value: string) {
    this.y += 1;
    this.text(value.toUpperCase(), { size: 8, bold: true, color: COLOR.muted, gap: 2 });
  }
}

const day = (iso: string) => formatDate(iso, 'd MMMM yyyy, h:mm a');
const r = (key: string, options?: Record<string, unknown>) => i18n.t(`payments:receipt.${key}`, options);

/** One receipt, on the current (fresh) page. */
export function drawReceipt(pdf: jsPDF, d: ReceiptDocument): void {
  const c = new Cursor(pdf);
  const b = d.breakdown;

  // Header: the platform, then what this is.
  const top = c.y;
  c.text(d.platform.name, { size: 22, bold: true, color: COLOR.pine, gap: 1 });
  c.text(`${d.platform.address} · ${d.platform.website} · ${d.platform.email}`, { size: 8, color: COLOR.muted });
  const afterBrand = c.y;
  c.y = top + 2;
  c.text(d.title, { size: 13, bold: true, align: 'right', gap: 1 });
  c.text(d.viewer === 'vendor' ? r('vendorCopy') : r('customerCopy'), { size: 8, color: COLOR.muted, align: 'right' });
  c.y = Math.max(c.y, afterBrand);
  c.rule(COLOR.pine);

  c.pairs([
  [d.kind === 'refund_note' ? r('refundNumber') : r('receiptNumber'), d.receiptNumber],
  [r('date'), day(d.issuedAt)],
  [r('reference'), d.reference],
  [r('status'), transactionStatusLabel(d.status, TRANSACTION_STATUS_META[d.status].label)],
  [r('method'), d.methodLabel],
  [r('paidOn'), d.paidAt ? day(d.paidAt) : r('notPaid')]]
  );
  c.rule();

  c.pairs([
  [r('customer'), d.customerName],
  [r('vendor'), d.vendor.name],
  [r('for'), d.description],
  [r('vendorBusiness'), [d.vendor.trade, d.vendor.location].filter(Boolean).join(' · ') || '—']]
  );
  c.rule();

  c.heading(d.subject.kind === PAYMENT_SUBJECT.Job ? r('service') : r('items'));
  b.items.forEach((l) => c.row(l.label, formatSignedNaira(l.amount)));
  if (b.deliveryFee > 0) c.row(r('deliveryFee'), formatSignedNaira(b.deliveryFee));
  c.rule(COLOR.line, 2);
  c.row(r('totalPaid'), formatSignedNaira(b.total), { bold: true, size: 12 });

  if (b.fees.length) {
    c.heading(r('fees'));
    b.fees.forEach((l) => c.row(l.label, formatSignedNaira(l.amount), { color: COLOR.muted }));
  }
  if (b.refunds.length) {
    c.heading(r('refunds'));
    b.refunds.forEach((l) => c.row(l.label, formatSignedNaira(-l.amount)));
    c.rule(COLOR.line, 2);
    c.row(r('afterRefunds'), formatSignedNaira(b.netPaid), { bold: true, size: 12 });
  }

  if (d.commission) {
    const pct = `${Math.round(d.commission.rate * 1000) / 10}%`;
    c.heading(d.commission.estimated ? r('earningsEstimated') : r('earnings'));
    c.row(r('commission', { percent: pct }), formatSignedNaira(-d.commission.amount));
    c.row(r('youReceive'), formatSignedNaira(d.commission.vendorNet), { bold: true });
  }

  if (d.notes.length) {
    c.y += 2;
    d.notes.forEach((n) => c.text(n, { size: 9, color: COLOR.muted }));
  }

  c.rule();
  c.text(
    r('issuedPdf', { name: d.platform.name }),
    { size: 8, color: COLOR.muted }
  );
}

/** One PDF with one receipt per page (a single receipt, or a date range). */
export function drawReceipts(pdf: jsPDF, docs: readonly ReceiptDocument[]): void {
  docs.forEach((d, i) => {
    if (i > 0) pdf.addPage();
    drawReceipt(pdf, d);
  });
}

/* ---------- Browser: load jsPDF and the fonts on demand, then save ---------- */

let fontsPromise: Promise<PdfFonts> | null = null;

async function base64Of(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(r('fontFailed'));
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function loadFonts(): Promise<PdfFonts> {
  fontsPromise ??= Promise.all([base64Of(notoRegularUrl), base64Of(notoBoldUrl)]).then(([regular, bold]) => ({ regular, bold }));
  // Let a failed load be retried next time.
  fontsPromise.catch(() => {
    fontsPromise = null;
  });
  return fontsPromise;
}

async function createPdf(docs: readonly ReceiptDocument[], title: string): Promise<jsPDF> {
  const [{ jsPDF: JsPdf }, fonts] = await Promise.all([import('jspdf'), loadFonts()]);
  const pdf = new JsPdf({ unit: 'mm', format: 'a4' });
  registerFonts(pdf, fonts);
  pdf.setProperties({ title, creator: docs[0]?.platform.name ?? 'Gwani' });
  drawReceipts(pdf, docs);
  return pdf;
}

export const receiptFileName = (d: Pick<ReceiptDocument, 'kind' | 'reference'>) =>
`gwani-${d.kind === 'refund_note' ? 'refund-note' : 'receipt'}-${d.reference}.pdf`;

/** Saves one receipt (or refund note) as a PDF. */
export async function downloadReceiptPdf(doc: ReceiptDocument): Promise<void> {
  const pdf = await createPdf([doc], `${doc.title} ${doc.receiptNumber}`);
  pdf.save(receiptFileName(doc));
}

/** Saves every receipt in the list as one PDF, one per page. */
export async function downloadReceiptsPdf(docs: readonly ReceiptDocument[], fileName: string): Promise<void> {
  if (docs.length === 0) throw new Error(r('noneToDownload'));
  const pdf = await createPdf(docs, fileName.replace(/\.pdf$/, ''));
  pdf.save(fileName);
}
