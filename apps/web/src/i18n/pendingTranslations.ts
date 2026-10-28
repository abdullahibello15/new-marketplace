/*
 * Keys that exist in English but still need a Hausa translation from a person (never machine-written).
 * Until then the Hausa UI shows the English text, which is what it showed before these were keys.
 * locales.test.ts allows exactly these to be missing from ha/, and fails if one is translated but still
 * listed here.
 */
export const HAUSA_PENDING: readonly string[] = [
  // Receipts: the fee line on a late cancellation (was hard-coded English).
  'payments:receipt.lateFeeKept'
];
