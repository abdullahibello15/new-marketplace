import { useTranslation } from 'react-i18next';
import { roleLabel } from '../../../i18n/labels';
import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldXIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { AUTH_ROUTES, ROLE, ROLE_META, type Role } from '../constants';
import { useAuth } from '../hooks/useAuth';

/** Where the login page sends people back to afterwards. */
export interface LoginRedirectState {
  from?: string;
}

function Checking() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-pine" aria-hidden="true" />
      <span className="sr-only">{t('state.checkingSignIn')}</span>
    </div>);

}

function ToLogin() {
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={AUTH_ROUTES.login} replace state={{ from } satisfies LoginRedirectState} />;
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
export function RequireRole({ role, fallback, children }: {role: Role;fallback?: ReactNode;children?: ReactNode;}) {
  const { status, user, hasRole, switchRole } = useAuth();
  const mustSwitch = !!user && hasRole(role) && user.activeRole !== role;
  useEffect(() => {
    if (mustSwitch) void switchRole(role);
  }, [mustSwitch, role, switchRole]);

  if (status === 'loading') return <Checking />;
  if (status === 'signed_out') return <ToLogin />;
  if (!hasRole(role)) return <>{fallback ?? <NoRole role={role} />}</>;
  if (mustSwitch) return <Checking />;
  return <>{children ?? <Outlet />}</>;
}
