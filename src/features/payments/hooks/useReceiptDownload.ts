import i18n from '../../../i18n';
import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { getReceiptDocument, listReceiptDocuments } from '../services/transactionService';
import type { ReceiptDocument, ReceiptViewer } from '../types';

/** The PDF code (jsPDF and the fonts) only loads when someone actually downloads. */
const loadPdf = () => import('../utils/receiptPdf');

/**
 * Receipt PDF downloads: one receipt (already loaded, or by reference), or every receipt in a date range
 * as one PDF. `busy` is the reference being downloaded, or "range".
 */
export function useReceiptDownload() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (e) {
      toast.error(errorMessage(e, i18n.t('payments:receipt.pdfFailed')));
    } finally {
      setBusy(null);
    }
  }

  const downloadDocument = (doc: ReceiptDocument) => run(doc.reference, async () => (await loadPdf()).downloadReceiptPdf(doc));

  const downloadByReference = (reference: string, viewer: ReceiptViewer = 'customer') =>
  run(reference, async () => {
    const [doc, pdf] = await Promise.all([getReceiptDocument(reference, viewer), loadPdf()]);
    await pdf.downloadReceiptPdf(doc);
  });

  /** Dates are "yyyy-MM-dd"; either can be empty for no limit. */
  const downloadRange = (from: string, to: string) =>
  run('range', async () => {
    const [docs, pdf] = await Promise.all([listReceiptDocuments(from, to), loadPdf()]);
    if (docs.length === 0) {
      toast.error(i18n.t('payments:receipt.noneInRange'));
      return;
    }
    await pdf.downloadReceiptsPdf(docs, `gwani-receipts-${from || 'start'}-to-${to || 'today'}.pdf`);
    toast.success(i18n.t('payments:receipt.saved', { count: docs.length }));
  });

  return { busy, downloadDocument, downloadByReference, downloadRange };
}
