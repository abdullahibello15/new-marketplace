import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, ShoppingCartIcon } from 'lucide-react';
import { ORDER_ROUTES } from '../../features/orders/constants';
import { useCart } from '../../features/orders/hooks/useCart';
import { AccountMenu } from './AccountMenu';
import { CategoryNav } from './CategoryNav';
import { HeaderSearch } from './HeaderSearch';
import { MobileMenu } from './MobileMenu';
import { APP_INITIAL, APP_NAME } from '../../config/brand';

/**
 * The marketplace header, sticky on every buyer page: logo, the big search, account and cart; category
 * links in a second row on wide screens. Below `lg` the account and categories move into the hamburger
 * menu, and the search drops to its own row.
 */
export function MarketplaceHeader() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 bg-pine-deep text-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 lg:gap-6 lg:px-10">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-label={t('market.openMenu')}
          className="-ml-1 rounded-lg p-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden">

          <MenuIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <Link to="/" aria-label={t('market.home')} className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mustard text-lg font-extrabold text-ink" aria-hidden="true">{APP_INITIAL}</span>
          {/* The name is long: two short lines on narrow phones, one line from sm up. */}
          <span className="max-w-[7.5rem] text-sm font-extrabold leading-tight tracking-tight sm:max-w-none sm:text-lg lg:text-xl">{APP_NAME}</span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block">
          <HeaderSearch />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div className="hidden lg:block">
            <AccountMenu />
          </div>
          <Link
            to={ORDER_ROUTES.cart}
            aria-label={t('shell.cartItems', { count })}
            className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

            <ShoppingCartIcon className="h-6 w-6" aria-hidden="true" />
            <span className="hidden sm:inline" aria-hidden="true">{t('nav.cart')}</span>
            {count > 0 &&
            <span aria-hidden="true" className="absolute left-6 top-0.5 min-w-[1.25rem] rounded-full bg-mustard px-1 text-center text-xs font-extrabold leading-5 text-ink">
                {count > 99 ? '99+' : count}
              </span>
            }
          </Link>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <HeaderSearch />
      </div>
      <CategoryNav />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>);

}
