import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { InfoIcon, LogInIcon, LogOutIcon, MonitorSmartphoneIcon } from 'lucide-react';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { roleLabel } from '../../../i18n/labels';
import { AUTH_ROUTES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { RoleSwitcher } from './RoleSwitcher';

/**
 * The signed-in person in a shell's navigation: name, the role they're using (and a switcher if they have
 * several), the language, their signed-in devices, and sign out (to the login screen). Signed out: the language, a "Log in or sign up" button and a link to the
 * page about Gwani. `tone`
 * matches the sidebar (dark) or the phone "More" menu (light).
 */
export function AccountPanel({ subtitle, tone = 'dark', onNavigate }: {subtitle?: string;tone?: 'dark' | 'light';onNavigate?: () => void;}) {
  const { t } = useTranslation();
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const dark = tone === 'dark';
  const button = dark ?
  'border-white/15 text-white/85 hover:bg-white/5 hover:text-white focus-visible:ring-white/60' :
  'border-line text-ink hover:bg-sand focus-visible:ring-pine/40';

  if (status === 'loading') return null;
  if (!user) {
    return (
      <div className="space-y-3">
        <LanguageSelector tone={tone} className="px-2" />
        <Link
          to={AUTH_ROUTES.login}
          onClick={onNavigate}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 ${button}`}>

          <LogInIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('action.logInOrSignUp')}
        </Link>
        <Link
          to={AUTH_ROUTES.about}
          onClick={onNavigate}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-center text-sm font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 ${dark ? 'text-white/75 focus-visible:ring-white/60' : 'text-muted focus-visible:ring-pine/40'}`}>

          <InfoIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('action.aboutGwani')}
        </Link>
      </div>);

  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${dark ? 'bg-white/15' : 'bg-sand'}`}>{user.name[0]}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className={`truncate text-xs ${dark ? 'text-white/70' : 'text-muted'}`}>{subtitle ?? roleLabel(user.activeRole)}</p>
        </div>
      </div>
      <RoleSwitcher tone={tone} className="px-2" />
      <LanguageSelector tone={tone} className="px-2" />
      <Link
        to={AUTH_ROUTES.sessions}
        onClick={onNavigate}
        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 ${button}`}>

        <MonitorSmartphoneIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('auth:sessions.navLink')}
      </Link>
      <button
        type="button"
        onClick={() =>
        void signOut().then(() => {
          onNavigate?.();
          navigate(AUTH_ROUTES.login, { replace: true });
        })
        }
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 ${button}`}>

        <LogOutIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('action.signOut')}
      </button>
    </div>);

}
