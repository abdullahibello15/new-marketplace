import { NavLink } from 'react-router-dom';

const tabs = [
{ to: '/pro/catalogue', label: 'Services', end: true },
{ to: '/pro/catalogue/products', label: 'Products', end: false }];


export function CatalogueTabs() {
  return (
    <nav aria-label="Catalogue sections" className="flex">
      <div className="flex rounded-xl bg-sand p-1">
        {tabs.map((t) =>
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
          `whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
          isActive ? 'bg-white text-ink' : 'text-muted hover:text-ink'}`
          }>

            {t.label}
          </NavLink>
        )}
      </div>
    </nav>);

}
