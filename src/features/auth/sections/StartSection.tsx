import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LogInIcon, UserPlusIcon } from 'lucide-react';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { AUTH_ROUTES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import type { LoginRedirectState } from '../components/guards';

/**
 * /start — the Welcome screen signed-out visitors land on while login is required (REQUIRE_LOGIN):
 * "Create account" (the role picker, then that role's signup) or "Log in". The page they wanted is passed
 * on, so they end up there afterwards.
 */
export function StartSection() {
  const { t } = useTranslation('auth');
  const { user, homeFor } = useAuth();
  const from = (useLocation().state as LoginRedirectState | null)?.from;

  if (user) return <Navigate to={from ?? homeFor()} replace />;

  return (
    <div className="space-y-6">
      <LanguageSelector variant="buttons" />
      <div>
        <h1 className="text-2xl font-extrabold">{t('start.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('start.intro')}</p>
      </div>
      <div className="space-y-3">
        <Link to={AUTH_ROUTES.signup} state={{ from } satisfies LoginRedirectState} className={buttonClasses({ fullWidth: true })}>
          <UserPlusIcon className="h-5 w-5" aria-hidden="true" />
          {t('start.createAccount')}
        </Link>
        <Link to={AUTH_ROUTES.login} state={{ from } satisfies LoginRedirectState} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
          <LogInIcon className="h-5 w-5" aria-hidden="true" />
          {t('start.logIn')}
        </Link>
      </div>
      <p className="text-xs text-muted">{t('start.note')}</p>
    </div>);

}
