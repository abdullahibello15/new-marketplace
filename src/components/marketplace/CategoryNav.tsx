import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { categoryLinks } from './categoryLinks';

/** The second header row on wide screens: category links, scrolling sideways if they don't fit. */
export function CategoryNav() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  return (
    <nav aria-label={t('market.categories')} className="hidden border-t border-white/10 bg-pine lg:block">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-10 py-1.5">
        {categoryLinks().map((c) => {
          const active = c.isActive(pathname, params);
          return (
            <li key={c.key} className="shrink-0">
              <Link
                to={c.to}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
                }>

                {c.label}
              </Link>
            </li>);

        })}
      </ul>
    </nav>);

}
