import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AUTH_ROUTES, ROLE } from '../../features/auth/constants';
import { LANDING_SECTION } from '../../features/landing/constants';

const link = 'rounded text-white/80 underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

/** The marketplace footer: help, about and contact links, then the copyright and the discreet staff login. */
export function MarketplaceFooter() {
  const { t } = useTranslation();
  const about = (section: string) => `${AUTH_ROUTES.about}#${section}`;
  const columns: {title: string;links: {label: string;to?: string;}[];}[] = [
  {
    title: t('market.footer.help'),
    links: [
    { label: t('market.footer.howItWorks'), to: about(LANDING_SECTION.HowItWorks) },
    { label: t('market.footer.faq'), to: about(LANDING_SECTION.Faq) },
    { label: t('market.footer.payments'), to: '/payments' }]

  },
  {
    title: t('market.footer.about'),
    links: [
    { label: t('action.aboutGwani'), to: AUTH_ROUTES.about },
    { label: t('market.footer.sell'), to: AUTH_ROUTES.signupFor(ROLE.Provider) },
    { label: t('market.footer.providerTerms'), to: AUTH_ROUTES.providerTerms }]

  },
  {
    title: t('market.footer.contact'),
    // PLACEHOLDER: Gwani's support phone, email and address don't exist yet (also missing on the landing page).
    links: [{ label: t('market.footer.contactSoon') }]
  }];


  return (
    <footer className="mt-12 bg-pine-deep text-sm text-white print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3 lg:px-10">
        {columns.map((col) =>
        <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-mustard">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) =>
            <li key={l.label}>{l.to ? <Link to={l.to} className={link}>{l.label}</Link> : <span className="text-white/60">{l.label}</span>}</li>
            )}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-white/70 lg:px-10">
          <p>{t('market.footer.rights', { year: new Date().getFullYear() })}</p>
          <Link to={AUTH_ROUTES.staffLogin} className={`${link} text-white/60`}>{t('market.footer.staffLogin')}</Link>
        </div>
      </div>
    </footer>);

}
