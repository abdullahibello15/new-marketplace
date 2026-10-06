/** Payment timings and limits. Change them here only. */
export const PAYMENT_CONFIG = {
  /** A one-time transfer account stays open this long. */
  transferExpiryMinutes: 30,
  /** A USSD code works for this long. */
  ussdExpiryMinutes: 10,
  /** An unfinished card checkout session lapses after this long. */
  cardSessionMinutes: 30,
  /** The hosted card page counts as timed out if it hasn't come back after this long. */
  cardPopupTimeoutSeconds: 90,
  /** How often to ask for the status while waiting for a transfer or USSD payment. */
  pollIntervalMs: 4000,
  /** Stop polling automatically after this long; the customer can still check by hand. */
  pollMaxMinutes: 10
} as const;

/* ---------- MOCK payment provider (delete with the real PSP integration) ---------- */

export const MOCK_PSP = {
  /** Shown as the PSP on the simulated hosted page. */
  providerName: 'PayGate (simulated)',
  /** Bank that issues the one-time transfer accounts. */
  transferBankName: 'Wema Bank',
  /** How long a simulated transfer or USSD approval takes to reach the provider, in ms. */
  settlementDelayMs: 6000,
  /** Latency of each payment API call, in ms. */
  latencyMs: 500,
  /** For underpaid/overpaid transfer tests. */
  testDifference: 1000
} as const;

/**
 * Shows the "Demo" controls that stand in for the customer's bank (send exact/short/extra, approve
 * USSD). They exist only because nothing real happens in this build; set false with a real PSP.
 */
export const SHOW_PAYMENT_SIMULATOR = true;
