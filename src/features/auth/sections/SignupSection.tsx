import { Trans, useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { currentLanguage } from '../../../i18n';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { formatLocalPhone } from '../../../utils/phone';
import { AUTH_ROUTES, ROLE, ROLE_META, type SignupRole } from '../constants';
import { isAuthError } from '../errors';
import { registerUser } from '../services/authService';
import { RoleCards } from '../components/RoleCards';
import { RoleSetupForm, type RoleSetupValues } from '../components/RoleSetupForm';
import type { SignupState } from './LoginSection';

/**
 * /signup — after a new number is verified: "How will you use Gwani?", then that role's short setup.
 * Customers go on to a short welcome, providers to their dashboard, riders to theirs.
 */
export function SignupSection() {
  const { t } = useTranslation('auth');
  const state = useLocation().state as SignupState | null;
  const navigate = useNavigate();
  const [role, setRole] = useState<SignupRole | null>(null);
  const [claimPath, setClaimPath] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  if (!state?.signupToken) return <Navigate to={AUTH_ROUTES.login} replace />;
  const { signupToken, phone, from } = state;

  async function submit(values: RoleSetupValues) {
    if (!role) return;
    try {
      await registerUser({ signupToken, role, language: currentLanguage(), name: values.name, email: values.email || null, vendor: values.vendor, rider: values.rider });
      if (role === ROLE.Customer) navigate(AUTH_ROUTES.welcome, { replace: true, state: { from } });else
      navigate(ROLE_META[role].home, { replace: true });
    } catch (e) {
      if (isAuthError(e) && e.code === 'invite_exists') setClaimPath(e.claimPath);
      if (isAuthError(e) && e.code === 'signup_expired') setExpired(true);
      throw e;
    }
  }

  if (expired) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-extrabold">{t('signup.expiredTitle')}</h1>
        <p className="text-sm text-muted">{t('signup.expiredBody')}</p>
        <Link to={AUTH_ROUTES.login} replace className="font-bold text-pine underline">{t('signup.startAgain')}</Link>
      </div>);

  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <Trans t={t} i18nKey="signup.verified" values={{ phone: formatLocalPhone(phone) }} components={{ strong: <strong className="text-ink" /> }} />
      </p>
      <LanguageSelector variant="buttons" />
      {role ?
      <RoleSetupForm role={role} askName submitLabel={t('signup.createAccount')} onSubmit={submit} onBack={() => setRole(null)} /> :
      <RoleCards onSelect={setRole} />
      }
      {claimPath &&
      <p className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
          {t('signup.inviteExists')}{' '}
          <Link to={claimPath} className="font-bold text-pine underline">{t('signup.claimNow')}</Link>
        </p>
      }
    </div>);

}
