import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { SEARCH_ROUTE } from '../../discovery/constants';
import type { LoginRedirectState } from '../../auth/components/guards';

/**
 * Phones only: one orange "Find a service" pill fixed to the bottom of the screen while scrolling, clear
 * of the home indicator (safe-area inset). Hidden while the menu is open (the menu has the account
 * buttons). The page leaves room for it at the bottom, so it never covers the footer.
 */
export function MobileActionBar({ from, hidden }: {from?: string;hidden: boolean;}) {
  const { t } = useTranslation('landing');
  if (hidden) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#F1F2EA] via-[#F1F2EA]/90 to-transparent px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-6 md:hidden">
      <Link
        to={AUTH_ROUTES.signupFor(ROLE.Customer)}
        state={{ from: from ?? SEARCH_ROUTE } satisfies LoginRedirectState}
        className="pointer-events-auto flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#C0501F] px-6 text-lg font-semibold text-white shadow-[0_12px_24px_-10px_rgba(200,80,31,0.7)] hover:bg-[#AE4419] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C8501F]/35">

        <SearchIcon className="h-5 w-5" aria-hidden="true" />
        {t('hero.findService')}
      </Link>
    </div>);

}
