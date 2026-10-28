import { AUTO_CONFIRM_HOURS } from '../../jobs/constants';
import { PAYMENT_METHOD } from '../constants';
import type { PaymentMethod } from '../types';

/**
 * Escrow rules: the one place to change commission and release timing.
 *
 * - Service jobs: released when the customer confirms completion, or automatically
 *   `jobAutoReleaseHours` after the vendor marks it done (the job state machine's existing auto-confirm).
 * - Retail orders: released when the customer confirms receipt or pickup, or automatically
 *   `orderAutoReleaseHours` after Delivered/Collected (the order state machine reads this value).
 * - Cancelled before the job starts: refunded, less the cancellation policy's fee (which goes to the vendor).
 * - Disputed: held until Gwani's team resolves it.
 */
export const ESCROW_CONFIG = {
  /** Platform commission, taken when money is released to the vendor. 0.05 = 5%. MOCK value. */
  commissionRate: 0.05,
  /** Reuses the job auto-confirm window. */
  jobAutoReleaseHours: AUTO_CONFIRM_HOURS,
  orderAutoReleaseHours: 72,
  /** Online methods go through escrow; cash never does. */
  heldMethods: [PAYMENT_METHOD.Card, PAYMENT_METHOD.Transfer, PAYMENT_METHOD.Ussd] as readonly PaymentMethod[],
  /** MOCK: show the "Gwani admin" dispute-resolution buttons so the flow can be tried. False in production. */
  showAdminDemoActions: true,
  /** For the admin "split" resolution demo: the share refunded to the customer. */
  demoSplitRefundShare: 0.5
} as const;
