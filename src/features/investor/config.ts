/*
 * Investor dividend rules: the ONE place to change how dividends are worked out, split and declared,
 * and the payout limits. The mock ledger is generated with these rules, and utils/ledger.ts reads them.
 *
 * ⚠️ PLACEHOLDER: every value below is a placeholder and must be confirmed against the build spec
 * (it wasn't provided). Real money movement and legal/tax reporting need a backend.
 */
export const DIVIDEND_RULES = {
  /**
   * How the pool is calculated: this share of an investment's net revenue for the period goes into its
   * dividend pool. PLACEHOLDER
   */
  poolShareOfNetRevenue: 0.3,
  /**
   * How the pool is split: pro rata to the capital each investor holds in that investment on the
   * declaration date (their capital ÷ the investment's total capital). PLACEHOLDER
   */
  splitMethod: 'pro_rata_capital' as const,
  /**
   * How often dividends are declared, in months, aligned to the calendar year: 3 = quarterly, declared
   * on the last day of March, June, September and December. PLACEHOLDER
   */
  declarationEveryMonths: 3,
  /** The "next dividend" estimate averages the investor's last this-many declarations. PLACEHOLDER */
  estimateFromLastDeclarations: 2,
  /** Smallest payout an investor can request, whole Naira. PLACEHOLDER */
  minimumPayout: 5000
} as const;

/* ---------- MOCK (remove with the real backend) ---------- */

export const MOCK_INVESTOR_CONFIG = {
  /** A payout request is approved automatically this long after it's made (checked when the data is read). */
  approvalDelaySeconds: 20,
  /** Show "Approve now (demo)" on pending payout requests. False in production. */
  showDemoControls: true,
  latencyMs: 400
} as const;
