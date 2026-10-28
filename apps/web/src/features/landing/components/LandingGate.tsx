import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AUTH_ROUTES, ROLE, ROLE_META } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';

const LandingPage = lazy(() => import('../sections/LandingPage').then((m) => ({ default: m.LandingPage })));

/** A blank page in the landing's colours while the session is checked or the page loads (no flash, no jump). */
const Blank = () => <div className="min-h-screen bg-cream" aria-busy="true" />;

/**
 * Wraps the customer app. At "/" (AUTH_ROUTES.start) it decides what to show:
 *  - signed out: the marketplace home, so guests can browse, search and fill a cart without an account;
 *  - signed in as a customer: the same home;
 *  - signed in with another active role: that role's home (vendor dashboard, rider, admin console).
 * Every other path passes straight through.
 */
export function LandingGate({ children }: {children: ReactNode;}) {
  const { pathname } = useLocation();
  const { status, user } = useAuth();
  if (pathname !== AUTH_ROUTES.start) return <>{children}</>;
  if (status === 'loading') return <Blank />;
  if (user && user.activeRole !== ROLE.Customer) return <Navigate to={ROLE_META[user.activeRole].home} replace />;
  return <>{children}</>;
}

/** /about: the public landing page about Gwani, with its own header and footer (outside the customer shell). */
export function AboutPage() {
  return (
    <Suspense fallback={<Blank />}>
      <LandingPage />
    </Suspense>);

}
