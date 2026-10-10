import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { Link, useLocation } from 'react-router-dom';
import { BadgeCheckIcon, SearchIcon, ShieldCheckIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { useAuth } from '../hooks/useAuth';

const TIPS = [
{ icon: SearchIcon, key: 'search' },
{ icon: BadgeCheckIcon, key: 'badges' },
{ icon: ShieldCheckIcon, key: 'pay' }] as const;


/** /welcome — the short customer onboarding after signup, then on to the customer home. */
export function WelcomeSection() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const from = (useLocation().state as {from?: string;} | null)?.from;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{user ? t('welcome.title', { name: user.name.split(' ')[0] }) : t('welcome.titleNoName')}</h1>
      <LanguageSelector variant="buttons" />
      <ul className="space-y-3">
        {TIPS.map(({ icon: Icon, key }) =>
        <li key={key} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3EEEC] text-pine" aria-hidden="true"><Icon className="h-5 w-5" /></span>
            <span>
              <span className="block font-bold">{t(`welcome.tip.${key}Title`)}</span>
              <span className="block text-sm text-muted">{t(`welcome.tip.${key}Text`)}</span>
            </span>
          </li>
        )}
      </ul>
      <Link to={from ?? '/'} replace className={buttonClasses({ variant: 'primary', fullWidth: true })}>{t('welcome.start')}</Link>
    </div>);

}
