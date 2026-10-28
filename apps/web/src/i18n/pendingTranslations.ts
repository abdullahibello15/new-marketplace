/*
 * Keys that exist in English but still need a Hausa translation from a person (never machine-written).
 * Until then the Hausa UI shows the English text, which is what it showed before these were keys.
 * locales.test.ts allows exactly these to be missing from ha/, and fails if one is translated but still
 * listed here.
 */
export const HAUSA_PENDING: readonly string[] = [
  // Receipts: the fee line on a late cancellation (was hard-coded English).
  'payments:receipt.lateFeeKept',
  // Escrow ledger notes, stored on each entry (were hard-coded English, shown in English in both languages).
  'payments:escrowNote.paidIn',
  'payments:escrowNote.jobConfirmed',
  'payments:escrowNote.orderReceived',
  'payments:escrowNote.paidAfterCompletion',
  'payments:escrowNote.vendorFavour',
  'payments:escrowNote.partRefund',
  'payments:escrowNote.fullRefund',
  'payments:escrowNote.cancelledLessFee',
  'payments:escrowNote.cancelledBeforeStart',
  'payments:escrowNote.orderDidntGoAhead',
  'payments:escrowNote.outOfStock',
  'payments:escrowNote.problemReported',
  'payments:escrowNote.dismissedJob',
  'payments:escrowNote.dismissedOrder',
  'payments:escrowNote.paidOut'
];
