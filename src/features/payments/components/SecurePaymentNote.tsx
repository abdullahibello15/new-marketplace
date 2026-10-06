import { LockIcon } from 'lucide-react';

/** Reassurance under the payment form. Accurate for this build: we never handle card details. */
export function SecurePaymentNote() {
  return (
    <p className="flex gap-2 rounded-xl bg-[#E3EEEC] px-3 py-2.5 text-sm text-pine">
      <LockIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Secure payment. Card details are entered only on our payment partner’s page, never in Gwani, and we never store them. Online payments
        are refunded if the vendor cancels or can’t fill your order.
      </span>
    </p>);

}
