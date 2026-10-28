import { useTranslation } from 'react-i18next';
import { roleLabel } from '../../../i18n/labels';
import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldXIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { AUTH_ROUTES, ROLE, ROLE_META, type Role } from '../constants';
import { REQUIRE_LOGIN, isPublicPath } from '../config';
import { useAuth } from '../hooks/useAuth';
import type { ClientEndReason } from '../types';

/** Where the login page sends people back to afterwards. */
export interface LoginRedirectState {
  from?: string;
  /** Why they were signed out ("Your session has expired"…), shown on the login screen. */
  reason?: ClientEndReason;
}

function Checking() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-pine" aria-hidden="true" />
      <span className="sr-only">{t('state.checkingSignIn')}</span>
    </div>);

}

function ToLogin({ to = AUTH_ROUTES.login }: {to?: string;}) {
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={to} replace state={{ from } satisfies LoginRedirectState} />;
}

/** Signed-in only: anyone else goes to the login page, and comes back here afterwards. */
export function RequireAuth({ children }: {children?: ReactNode;}) {
  const { status } = useAuth();
  if (status === 'loading') return <Checking />;
  if (status === 'signed_out') return <ToLogin />;
  return <>{children ?? <Outlet />}</>;
}

/** What someone signed in without the role sees (the admin console passes its own). */
function NoRole({ role }: {role: Role;}) {
  const { t } = useTranslation('auth');
  const { homeFor } = useAuth();
  const name = roleLabel(role, ROLE_META[role].label);
  const canAdd = role !== ROLE.Admin;
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center">
        <ShieldXIcon className="mx-auto h-10 w-10 text-clay-dark" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-extrabold">{t('guard.noRoleTitle', { role: name })}</h1>
        <p className="mt-2 text-sm text-muted">{canAdd ? t('guard.addRoleBody', { role: name }) : t('guard.staffOnly')}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {canAdd && <Link to={AUTH_ROUTES.addRole} className={buttonClasses({ variant: 'primary' })}>{t('guard.addRole')}</Link>}
          <Link to={homeFor()} className={buttonClasses({ variant: 'secondary' })}>{t('guard.backHome')}</Link>
        </div>
      </section>
    </main>);

}

/**
 * Signed in AND holding `role`. Signed out → login (and back). Holding the role but using another one
 * right now → switches to it (the shell follows the active role). Without the role → `fallback`.
 */
export function RequireRole({ role, fallback, loginTo, children }: {role: Role;fallback?: ReactNode;/** Where signed-out visitors go (default: the login page; staff: the staff login). */loginTo?: string;children?: ReactNode;}) {
  const { status, user, hasRole, switchRole } = useAuth();
  const mustSwitch = !!user && hasRole(role) && user.activeRole !== role;
  useEffect(() => {
    if (mustSwitch) void switchRole(role);
  }, [mustSwitch, role, switchRole]);

  if (status === 'loading') return <Checking />;
  if (status === 'signed_out') return <ToLogin to={loginTo} />;
  if (!hasRole(role)) return <>{fallback ?? <NoRole role={role} />}</>;
  if (mustSwitch) return <Checking />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * The whole-app login requirement (REQUIRE_LOGIN in config.ts). Signed out on anything but a public page
 * → the landing page (/about), remembering where they were going. With REQUIRE_LOGIN off it lets everything
 * through and each page's own guard (RequireAuth/RequireRole) decides, as before.
 */
export function LoginGate({ children }: {children?: ReactNode;}) {
  const { status } = useAuth();
  const location = useLocation();
  if (!REQUIRE_LOGIN || isPublicPath(location.pathname)) return <>{children ?? <Outlet />}</>;
  if (status === 'loading') return <Checking />;
  if (status === 'signed_out') {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={AUTH_ROUTES.about} replace state={{ from } satisfies LoginRedirectState} />;
  }
  return <>{children ?? <Outlet />}</>;
}

/**
 * Inside the vendor portal: a provider who signed up but hasn't set up their business yet goes to vendor
 * setup first (the portal's pages all need a vendor profile).
 */
export function RequireVendorProfile({ children }: {children?: ReactNode;}) {
  const { user } = useAuth();
  if (user && user.roles.includes(ROLE.Provider) && !user.vendorId) return <Navigate to={AUTH_ROUTES.vendorSetup} replace />;
  return <>{children ?? <Outlet />}</>;
}
