import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeftRightIcon, EllipsisIcon } from 'lucide-react';
import { LoadingState } from './ui/LoadingState';
import { BottomNavItem } from './shell/BottomNavItem';
import { MobileMoreMenu } from './shell/MobileMoreMenu';
import { SidebarLink } from './shell/SidebarLink';
import type { NavItem } from '../types/navigation';

interface AppShellProps {
  navItems: NavItem[];
  homeTo: string;
  modeLabel?: string;
  account: {name: string;subtitle: string;};
  switchLink: {to: string;label: string;};
}

export function AppShell({ navItems, homeTo, modeLabel, account, switchLink }: AppShellProps) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Placement comes from each item's config, so adding a page never means editing this component.
  const mainItems = navItems.filter((i) => (i.group ?? 'main') === 'main');
  const accountItems = navItems.filter((i) => i.group === 'account');
  const barItems = navItems.filter((i) => (i.mobile ?? 'bar') === 'bar');
  const moreItems = navItems.filter((i) => i.mobile === 'more');
  const moreActive = moreItems.some((i) => i.match(pathname));
  const barColumns = barItems.length + (moreItems.length ? 1 : 0);

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <div className="min-h-screen w-full bg-cream font-sans text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 print:hidden flex-col overflow-y-auto bg-pine-deep px-5 py-7 text-white lg:flex">
        <Link to={homeTo} className="flex items-center gap-2.5 rounded-lg px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mustard text-lg font-extrabold text-ink">G</span>
          <span className="text-xl font-extrabold tracking-tight">Gwani</span>
          {modeLabel &&
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-mustard">{modeLabel}</span>
          }
        </Link>
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {mainItems.map((item) =>
          <SidebarLink key={item.to} item={item} active={item.match(pathname)} />
          )}
        </nav>

        <div className="mt-auto pt-8">
          {accountItems.length > 0 &&
          <nav aria-labelledby="sidebar-account-heading" className="mb-5 flex flex-col gap-1">
              <p id="sidebar-account-heading" className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-white/50">
                Account
              </p>
              {accountItems.map((item) =>
            <SidebarLink key={item.to} item={item} active={item.match(pathname)} />
            )}
            </nav>
          }
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 px-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                {account.name[0]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{account.name}</p>
                <p className="truncate text-xs text-white/70">{account.subtitle}</p>
              </div>
            </div>
            <Link
              to={switchLink.to}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/85 transition-colors duration-150 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

              <ArrowLeftRightIcon className="h-4 w-4" aria-hidden="true" />
              {switchLink.label}
            </Link>
          </div>
        </div>
      </aside>

      <main className="pb-24 lg:pb-0 lg:pl-64 print:p-0">
        {/* Routes are lazy-loaded; keep the shell and nav visible while a page's code downloads. */}
        <Suspense
          fallback={
          <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
              <LoadingState label="Loading page" rows={3} />
            </div>
          }>

          <Outlet />
        </Suspense>
      </main>

      <nav
        aria-label="Main"
        style={{ gridTemplateColumns: `repeat(${barColumns}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-cream pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">

        {barItems.map((item) =>
        <BottomNavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.shortLabel ?? item.label}
          active={item.match(pathname)}
          badge={item.badge}
          badgeStyle={item.badgeStyle}
          badgeLabel={item.badgeLabel} />

        )}
        {moreItems.length > 0 &&
        <BottomNavItem
          icon={EllipsisIcon}
          label="More"
          active={moreActive || moreOpen}
          onClick={() => setMoreOpen(true)}
          buttonProps={{ 'aria-haspopup': 'dialog', 'aria-expanded': moreOpen }} />

        }
      </nav>

      {moreItems.length > 0 &&
      <MobileMoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={moreItems}
        pathname={pathname}
        switchLink={switchLink} />

      }
    </div>);

}
