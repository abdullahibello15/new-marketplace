import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { landingButton } from './landingStyles';
import type { LoginRedirectState } from '../../auth/components/guards';

interface LandingCtasProps {
  /** Where they were going before landing here (passed on, so they end up there after signing in). */
  from?: string;
  /** Header size (still 44px tall) or full size. */
  compact?: boolean;
  /** Two equal columns (mobile menu, bottom bar) or side by side. */
  fullWidth?: boolean;
  onNavigate?: () => void;
}

/**
 * "Log in" (gold outline) and "Create account" (deep teal) for visitors. Someone already signed in sees a way
 * back instead: staff "Go to admin console", everyone else "Go to my account".
 */
export function LandingCtas({ from, compact = false, fullWidth = false, onNavigate }: LandingCtasProps) {
  const { t } = useTranslation('landing');
  const { user, hasRole, homeFor } = useAuth();
  const state = { from } satisfies LoginRedirectState;
  // Pills, like the hero's buttons.
  const size = `rounded-full ${compact ? landingButton.compact : ''}`;
  const wrap = fullWidth ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-2';

  if (user) {
    const admin = hasRole(ROLE.Admin);
    return (
      <Link to={admin ? '/admin' : homeFor()} onClick={onNavigate} className={`${landingButton.primary} ${size}`}>
        {admin ? t('nav.goToConsole') : t('nav.goToApp')}
      </Link>);

  }
  return (
    <div className={wrap}>
      <Link to={AUTH_ROUTES.login} state={state} onClick={onNavigate} className={`${landingButton.secondary} ${size}`}>{t('nav.logIn')}</Link>
      <Link to={AUTH_ROUTES.signup} state={state} onClick={onNavigate} className={`${landingButton.primary} ${size}`}>{t('nav.createAccount')}</Link>
    </div>);

}
