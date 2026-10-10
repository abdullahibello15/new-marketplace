import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3Icon, FileCheck2Icon, FileUpIcon, GavelIcon, HeartHandshakeIcon, LogOutIcon, MenuIcon, ScrollTextIcon, ShieldCheckIcon, XIcon, type LucideIcon } from 'lucide-react';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ADMIN_ROLES, ADMIN_SECTION, type AdminSection } from '../config/roles';
import { ADMIN_ROUTES } from '../constants';
import { AUTH_ROUTES } from '../../auth/constants';
import { RoleSwitcher } from '../../auth/components/RoleSwitcher';
import { useAdminSession } from '../hooks/useAdminSession';
import { NotAuthorised } from './NotAuthorised';

const SECTION_NAV: Record<AdminSection, {to: string;label: string;icon: LucideIcon;}> = {
  verification: { to: ADMIN_ROUTES.verification, label: 'Verification', icon: FileCheck2Icon },
  disputes: { to: ADMIN_ROUTES.disputes, label: 'Disputes', icon: GavelIcon },
  moderation: { to: ADMIN_ROUTES.moderation, label: 'Moderation', icon: ShieldCheckIcon },
  analytics: { to: ADMIN_ROUTES.analytics, label: 'Analytics', icon: BarChart3Icon },
  outreach: { to: ADMIN_ROUTES.outreach, label: 'Vendor outreach', icon: HeartHandshakeIcon },
  bulk: { to: ADMIN_ROUTES.bulk, label: 'Bulk tools', icon: FileUpIcon },
  audit: { to: ADMIN_ROUTES.audit, label: 'Audit log', icon: ScrollTextIcon }
};

/** Sidebar order is fixed; each role only gets the sections it needs. */
const ORDER: AdminSection[] = [ADMIN_SECTION.Verification, ADMIN_SECTION.Disputes, ADMIN_SECTION.Moderation, ADMIN_SECTION.Analytics, ADMIN_SECTION.Outreach, ADMIN_SECTION.BulkTools, ADMIN_SECTION.Audit];

function SidebarContent({ sections, onNavigate }: {sections: AdminSection[];onNavigate?: () => void;}) {
  const { pathname } = useLocation();
  const { admin, signOut } = useAdminSession();
  const navigate = useNavigate();
  if (!admin) return null;
  return (
    <div className="flex h-full flex-col">
      <Link to={ADMIN_ROUTES.home} onClick={onNavigate} className="flex items-center gap-2.5 rounded-lg px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mustard text-lg font-extrabold text-ink">G</span>
        <span className="text-xl font-extrabold tracking-tight">Gwani</span>
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-mustard">Admin</span>
      </Link>
      <nav aria-label="Admin" className="mt-10 flex flex-col gap-1">
        {ORDER.filter((s) => sections.includes(s)).map((s) => {
          const { to, label, icon: Icon } = SECTION_NAV[s];
          const active = pathname.startsWith(to);
          return (
            <Link
              key={s}
              to={to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>

              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>);

        })}
      </nav>

      <div className="mt-auto space-y-3 pt-8">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="font-bold">{admin.name}</p>
          <p className="text-sm text-white/70">{ADMIN_ROLES[admin.role].label}</p>
          <RoleSwitcher tone="dark" className="mt-3" />
        </div>
        <button
          type="button"
          onClick={() => void signOut().then(() => navigate(AUTH_ROUTES.login))}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

          <LogOutIcon className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>);

}

/**
 * /admin: its own layout, not the customer or vendor shell. Non-admins see "Not authorised". A fixed
 * sidebar on desktop; a top bar with a hamburger that opens the same sidebar as a drawer on mobile.
 */
export function AdminLayout() {
  const { admin } = useAdminSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!admin) return <NotAuthorised />;
  const sections = ADMIN_ROLES[admin.role].sections;

  return (
    <div className="min-h-screen w-full bg-cream font-sans text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto bg-pine-deep px-5 py-7 text-white lg:flex print:hidden">
        <SidebarContent sections={sections} />
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-pine-deep px-4 py-3 text-white lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="rounded-lg p-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

          <MenuIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <span className="font-extrabold">Gwani Admin</span>
        <span className="ml-auto truncate text-sm text-white/70">{admin.name}</span>
      </header>

      {open &&
      <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div id="admin-drawer" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-pine-deep px-5 py-6 text-white">
            <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close admin menu"
            className="mb-4 self-end rounded-lg p-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent sections={sections} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      }

      <main className="lg:pl-64">
        <Suspense
          fallback={
          <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
              <LoadingState label="Loading" rows={3} rowClassName="h-32" />
            </div>
          }>

          <Outlet />
        </Suspense>
      </main>
    </div>);

}

/** Wraps a section's route: roles without it get a "no access" message instead (the sidebar hides it too). */
export function RequireSection({ section, children }: {section: AdminSection;children: ReactNode;}) {
  const { sees, admin } = useAdminSession();
  if (!admin) return null;
  if (!sees(section)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-12 text-center">
        <h1 className="text-xl font-extrabold">No access to {SECTION_NAV[section].label}</h1>
        <p className="mt-2 text-sm text-muted">Your role ({ADMIN_ROLES[admin.role].label}) doesn’t include this section.</p>
      </div>);

  }
  return <>{children}</>;
}

/** /admin → the first section this role can open. */
export function AdminHomeRedirect() {
  const { admin } = useAdminSession();
  if (!admin) return null;
  const first = ORDER.find((s) => ADMIN_ROLES[admin.role].sections.includes(s));
  return first ? <Navigate to={SECTION_NAV[first].to} replace /> : null;
}
