import { Suspense, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';

/** Sign-in, signup and onboarding pages: a simple centred card, no app navigation. */
export function AuthLayout({ children }: {children?: ReactNode;}) {
  return (
    <div className="min-h-screen bg-cream px-4 py-8 font-sans text-ink sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mustard text-lg font-extrabold text-ink">G</span>
          <span className="text-xl font-extrabold tracking-tight">Gwani</span>
        </Link>
        <main className="rounded-2xl border border-line bg-white p-5 sm:p-7">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-sand" />}>{children ?? <Outlet />}</Suspense>
        </main>
      </div>
    </div>);

}
