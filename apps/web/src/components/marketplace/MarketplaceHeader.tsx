import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, ShoppingCartIcon } from 'lucide-react';
import { ORDER_ROUTES } from '../../features/orders/constants';
import { useCart } from '../../features/orders/hooks/useCart';
import { AccountMenu } from './AccountMenu';
import { MobileMenu } from './MobileMenu';
import { APP_INITIAL, APP_NAME } from '../../config/brand';
import { customerNav } from '../../data/navigation';
import { PlaceChip } from '../../features/discovery/components/location/PlaceChip';
import { categoryLinks } from './categoryLinks';

/**
 * The marketplace header, sticky on every buyer page: brand and primary links on the left, location,
 * cart and account on the right. Search and category links stay in their own rows below the main bar.
 */
export function MarketplaceHeader() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const params = new URLSearchParams(search);
  const home = customerNav.find((item) => item.to === '/')!;
  const orders = customerNav.find((item) => item.to === ORDER_ROUTES.myOrders)!;
  const services = categoryLinks().find((item) => item.key === 'services')!;
  const primaryLinks = [
    { key: 'home', to: home.to, label: home.labelKey ? t(home.labelKey) : home.label, active: home.match(pathname) },
    { key: 'services', to: services.to, label: services.label, active: services.isActive(pathname, params) },
    { key: 'orders', to: orders.to, label: orders.shortLabelKey ? t(orders.shortLabelKey) : orders.shortLabel ?? orders.label, active: orders.match(pathname) }];
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 bg-pine-deep text-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3 sm:gap-4 lg:gap-6 lg:px-10">
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
        <nav aria-label={t('market.categories')} className="hidden lg:block">
          <ul className="flex gap-1">
            {primaryLinks.map((item) =>
            <li key={item.key} className="shrink-0">
              <Link
                to={item.to}
                aria-current={item.active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                item.active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                {item.label}
              </Link>
            </li>)}
          </ul>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div className="hidden lg:block">
            <PlaceChip />
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
          <div className="hidden lg:block">
            <AccountMenu />
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl justify-end px-5 pb-3 lg:hidden">
        <AccountMenu />
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>);

}
