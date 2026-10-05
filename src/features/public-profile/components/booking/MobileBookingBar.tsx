import React from 'react';
import { Price } from '../../../../components/ui/Price';

interface MobileBookingBarProps {
  /** Cheapest bookable price, if any. */
  fromPrice: number | null;
  children: React.ReactNode;
}

/** Phones only: keeps Book/Request in reach, pinned just above the bottom navigation. */
export function MobileBookingBar({ fromPrice, children }: MobileBookingBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-4">
        {fromPrice !== null &&
        <p className="shrink-0 text-sm text-muted">
            From
            <br />
            <Price amount={fromPrice} className="text-base font-bold text-ink" />
          </p>
        }
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>);

}
