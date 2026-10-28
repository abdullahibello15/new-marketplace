import { useTranslation } from 'react-i18next';
import React from 'react';
import { Price } from '../../../../components/ui/Price';

interface MobileBookingBarProps {
  /** Cheapest bookable price, if any. */
  fromPrice: number | null;
  children: React.ReactNode;
}

/** Phones only: keeps Book/Request in reach, pinned just above the bottom navigation. */
export function MobileBookingBar({ fromPrice, children }: MobileBookingBarProps) {
  const { t } = useTranslation('discovery');
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-4">
        {fromPrice !== null &&
        <p className="shrink-0 text-sm text-muted">
            {t('profile.from')}
            <br />
            <Price amount={fromPrice} className="text-base font-bold text-ink" />
          </p>
        }
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>);

}
