import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { AccountMenuContent } from './AccountMenu';
import { categoryLinks } from './categoryLinks';
import { customerNav } from '../../data/navigation';

/** The hamburger menu on phones and tablets: categories, then the account menu. A modal (focus stays inside). */
export function MobileMenu({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const home = customerNav.find((item) => item.to === '/')!;
  const orders = customerNav.find((item) => item.to === '/orders')!;
  const services = categoryLinks().find((item) => item.key === 'services')!;
  const primaryLinks = [
    { key: 'home', to: home.to, label: home.labelKey ? t(home.labelKey) : home.label, active: home.match(pathname) },
    { key: 'services', to: services.to, label: services.label, active: services.isActive(pathname, params) },
    { key: 'orders', to: orders.to, label: orders.shortLabelKey ? t(orders.shortLabelKey) : orders.shortLabel ?? orders.label, active: orders.match(pathname) }];
  return (
    <Dialog open={open} onClose={onClose} title={t('market.menu')} variant="sheet">
      <div className="space-y-5">
        <nav aria-label={t('market.categories')}>
          <ul className="flex flex-wrap gap-2">
            {primaryLinks.map((item) =>
            <li key={item.key}>
              <Link
                to={item.to}
                onClick={onClose}
                aria-current={item.active ? 'page' : undefined}
                className={`block rounded-full border px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
                item.active ? 'border-pine bg-pine text-white' : 'border-line bg-white text-ink hover:bg-sand'}`}>
                {item.label}
              </Link>
            </li>)}
          </ul>
        </nav>
        <section aria-label={t('market.account')} className="border-t border-line pt-4">
          <AccountMenuContent onNavigate={onClose} />
        </section>
      </div>
    </Dialog>);

}
