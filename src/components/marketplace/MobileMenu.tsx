import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { AccountMenuContent } from './AccountMenu';
import { categoryLinks } from './categoryLinks';

/** The hamburger menu on phones and tablets: categories, then the account menu. A modal (focus stays inside). */
export function MobileMenu({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  return (
    <Dialog open={open} onClose={onClose} title={t('market.menu')} variant="sheet">
      <div className="space-y-5">
        <nav aria-label={t('market.categories')}>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">{t('market.categories')}</h3>
          <ul className="flex flex-wrap gap-2">
            {categoryLinks().map((c) => {
              const active = c.isActive(pathname, params);
              return (
                <li key={c.key}>
                  <Link
                    to={c.to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-full border px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
                    active ? 'border-pine bg-pine text-white' : 'border-line bg-white text-ink hover:bg-sand'}`
                    }>

                    {c.label}
                  </Link>
                </li>);

            })}
          </ul>
        </nav>
        <section aria-label={t('market.account')} className="border-t border-line pt-4">
          <AccountMenuContent onNavigate={onClose} />
        </section>
      </div>
    </Dialog>);

}
