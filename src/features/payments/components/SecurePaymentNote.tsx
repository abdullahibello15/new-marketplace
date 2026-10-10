import { useTranslation } from 'react-i18next';
import { LockIcon } from 'lucide-react';

/**
 * Reassurance under the payment form. Accurate for this build: we never handle card details.
 * `escrow` adds the refund promise, which applies to job and order payments but not subscriptions.
 */
export function SecurePaymentNote({ escrow = true }: {escrow?: boolean;}) {
  const { t } = useTranslation('payments');
  return (
    <p className="flex gap-2 rounded-xl bg-[#E3EEEC] px-3 py-2.5 text-sm text-pine">
      <LockIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {t('secure')}
        {escrow && t('secureEscrow')}
      </span>
    </p>);

}
