import { useTranslation } from 'react-i18next';
import { LandingCtas } from './LandingCtas';

/**
 * Phones only: "Create account" and "Log in" fixed to the bottom of the screen while scrolling, clear of
 * the home indicator (safe-area inset). Hidden while the menu is open (the menu has the same buttons).
 * The page leaves room for it at the bottom, so it never covers the footer.
 */
export function MobileActionBar({ from, hidden }: {from?: string;hidden: boolean;}) {
  const { t } = useTranslation('landing');
  if (hidden) return null;
  return (
    <aside aria-label={t('actionBar')} className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-[#EFE7D6] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-16px_rgba(22,58,60,0.4)] backdrop-blur md:hidden">
      <LandingCtas from={from} fullWidth />
    </aside>);

}
