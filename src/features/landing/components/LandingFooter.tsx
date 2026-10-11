import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FacebookIcon, InstagramIcon, TwitterIcon, YoutubeIcon } from 'lucide-react';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { AUTH_ROUTES } from '../../auth/constants';
import { LANDING_NAV } from '../constants';
import { useScrollToSection } from '../hooks/useLandingScroll';

/**
 * PLACEHOLDER: Gwani's social accounts don't exist yet. Add each URL here when it does; until then the
 * icons show as "coming soon" (not links), so nobody is sent to someone else's page.
 */
const SOCIAL = [
{ name: 'Facebook', icon: FacebookIcon, url: null },
{ name: 'Instagram', icon: InstagramIcon, url: null },
{ name: 'X (Twitter)', icon: TwitterIcon, url: null },
{ name: 'YouTube', icon: YoutubeIcon, url: null }] as
const satisfies readonly {name: string;icon: typeof FacebookIcon;url: string | null;}[];

/**
 * Deep-teal footer in clear columns: about and language, explore, account, contact and legal, social
 * icons, and a discreet "Staff login" for Gwani staff.
 */
export function LandingFooter() {
  const { t } = useTranslation('landing');
  const scrollTo = useScrollToSection();
  const link = 'inline-block py-1 rounded text-base text-white/85 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
  const heading = 'text-sm font-extrabold uppercase tracking-wider text-[#F0D58C]';
  return (
    <footer className="bg-[#102D2F] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D9A933] text-lg font-black text-[#1C1B18]" aria-hidden="true">G</span>
            <span className="landing-display text-2xl font-black">Gwani</span>
          </p>
          <p className="mt-3 text-base text-white/80">{t('footer.tagline')}</p>
          <LanguageSelector tone="dark" className="mt-5 max-w-[13rem]" />
        </div>
        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className={heading}>{t('footer.explore')}</h2>
          <ul className="mt-4 space-y-1">
            {LANDING_NAV.map((item) =>
            <li key={item.id}>
                <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(item.id);
                }}
                className={link}>

                  {t(item.labelKey)}
                </a>
              </li>
            )}
          </ul>
        </nav>
        <nav aria-labelledby="footer-account">
          <h2 id="footer-account" className={heading}>{t('footer.account')}</h2>
          <ul className="mt-4 space-y-1">
            <li><Link to={AUTH_ROUTES.login} className={link}>{t('nav.logIn')}</Link></li>
            <li><Link to={AUTH_ROUTES.signup} className={link}>{t('nav.createAccount')}</Link></li>
            <li><Link to={AUTH_ROUTES.forgotPassword} className={link}>{t('auth:login.forgot')}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className={heading}>{t('footer.contactHeading')}</h2>
          {/* PLACEHOLDER: real contact details to come. */}
          <p className="mt-4 text-base text-white/80">{t('footer.contact')}</p>
          <h2 className={`${heading} mt-6`}>{t('footer.legal')}</h2>
          <ul className="mt-4 space-y-1 text-base text-white/80">
            <li><Link to={AUTH_ROUTES.providerTerms} className={link}>{t('footer.providerTerms')}</Link></li>
            {/* PLACEHOLDER: terms of use and privacy policy pages don't exist yet. */}
            <li className="py-1">{t('footer.terms')}</li>
            <li className="py-1">{t('footer.privacy')}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <ul className="flex items-center gap-2" aria-label={t('footer.social')}>
            {SOCIAL.map(({ name, icon: Icon, url }) =>
            <li key={name}>
                {url ?
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a> :

              <span title={t('footer.socialSoon')} aria-label={`${name}: ${t('footer.socialSoon')}`} role="img" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
              }
              </li>
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
            <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
            <Link to={AUTH_ROUTES.staffLogin} className="inline-flex min-h-[44px] items-center rounded text-white/60 underline-offset-2 hover:text-white/85 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              {t('footer.staffLogin')}
            </Link>
          </div>
        </div>
      </div>
    </footer>);

}
