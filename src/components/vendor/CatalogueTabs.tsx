import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

const tabs = [
{ to: '/pro/catalogue', label: 'products.tabServices', end: true },
{ to: '/pro/catalogue/products', label: 'products.tabProducts', end: false }];


export function CatalogueTabs() {
  const { t } = useTranslation('vendor');
  return (
    <nav aria-label={t('products.tabsLabel')} className="flex">
      <div className="flex rounded-xl bg-sand p-1">
        {tabs.map((tab) =>
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
          `whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
          isActive ? 'bg-white text-ink' : 'text-muted hover:text-ink'}`
          }>

            {t(tab.label)}
          </NavLink>
        )}
      </div>
    </nav>);

}
