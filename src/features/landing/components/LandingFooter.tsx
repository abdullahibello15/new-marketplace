import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AUTH_ROUTES } from '../../auth/constants';

/**
 * The slim bar at the bottom of the fixed landing screen (tablets and up; on phones these links are in
 * the menu): provider terms, the terms and privacy placeholders, contact (placeholder), the copyright and
 * a discreet "Staff login" for Gwani staff.
 */
export function LandingFooter() {
  const { t } = useTranslation('landing');
  const link = 'rounded underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50';
  return (
    <footer className="landing-teal-bg hidden shrink-0 border-t border-[#E6CF95]/30 md:block">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2.5 text-sm text-white/80">
        <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <li><Link to={AUTH_ROUTES.providerTerms} className={link}>{t('footer.providerTerms')}</Link></li>
          {/* PLACEHOLDER: terms of use, privacy policy and contact details don't exist yet. */}
          <li>{t('footer.termsShort')}</li>
          <li>{t('footer.privacyShort')}</li>
          <li>
            <Link to={AUTH_ROUTES.staffLogin} className={`${link} text-white/65`}>{t('footer.staffLogin')}</Link>
          </li>
        </ul>
      </div>
    </footer>);

}
