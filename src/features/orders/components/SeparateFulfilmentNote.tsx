import { InfoIcon } from 'lucide-react';

/** Explains why one checkout becomes several orders. Shown on the cart and at checkout. */
export function SeparateFulfilmentNote({ vendorCount }: {vendorCount: number;}) {
  if (vendorCount < 2) return null;
  return (
    <p className="flex gap-2 rounded-xl bg-[#E4EAF3] px-3 py-2.5 text-sm text-[#2B4A7A]">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Your cart has items from {vendorCount} vendors. Each vendor confirms, packs and delivers (or hands over) their part
        separately, so you’ll get {vendorCount} orders, one per vendor.
      </span>
    </p>);

}
