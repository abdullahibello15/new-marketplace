import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AUTH_ROUTES } from '../../constants';

/** After a duplicate email or phone: a friendly way to log in instead (says nothing more about the account). */
export function AlreadyRegistered() {
  const { t } = useTranslation('auth');
  return (
    <p className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
      {t('signup.alreadyRegistered')}{' '}
      <Link to={AUTH_ROUTES.login} className="font-bold text-pine underline underline-offset-2">{t('signup.logInInstead')}</Link>
    </p>);

}
