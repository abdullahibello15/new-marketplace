import { useTranslation } from 'react-i18next';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { VerifyContactBanner } from '../features/auth/components/VerifyContactBanner';
import { LoadingState } from './ui/LoadingState';
import { MarketplaceFooter } from './marketplace/MarketplaceFooter';
import { MarketplaceHeader } from './marketplace/MarketplaceHeader';

const MAIN_ID = 'main-content';

/**
 * The buyer marketplace layout: a sticky top header (logo, search, account, cart, categories), the page
 * in a full-width centred column, and a footer. No sidebar or bottom bar: on phones the header's
 * hamburger menu holds the categories and account. Open to everyone (browsing); pages that need an
 * account are guarded in the routes. (The vendor, rider and investor areas keep AppShell.)
 */
export function CustomerShell() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen w-full flex-col bg-cream font-sans text-ink">
      <a href={`#${MAIN_ID}`} className="sr-only z-50 rounded-lg bg-mustard px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {t('market.skipToContent')}
      </a>
      <MarketplaceHeader />
      <VerifyContactBanner />
      <main id={MAIN_ID} tabIndex={-1} className="flex-1 focus:outline-none print:p-0">
        {/* Routes are lazy-loaded; keep the header visible while a page's code downloads. */}
        <Suspense
          fallback={
          <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
              <LoadingState label={t('shell.loadingPage')} rows={3} />
            </div>
          }>

          <Outlet />
        </Suspense>
      </main>
      <MarketplaceFooter />
    </div>);

}
