import { useTranslation } from 'react-i18next';
import { InfoIcon } from 'lucide-react';

/** Explains why one checkout becomes several orders. Shown on the cart and at checkout. */
export function SeparateFulfilmentNote({ vendorCount }: {vendorCount: number;}) {
  const { t } = useTranslation('jobs');
  if (vendorCount < 2) return null;
  return (
    <p className="flex gap-2 rounded-xl bg-[#E4EAF3] px-3 py-2.5 text-sm text-[#2B4A7A]">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t('order.separate', { count: vendorCount })}</span>
    </p>);

}
