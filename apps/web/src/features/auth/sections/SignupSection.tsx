import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { currentLanguage } from '../../../i18n';
import { AUTH_ROUTES, ROLE, ROLE_META, SIGNUP_ROLES, type SignupRole } from '../constants';
import { isAuthError } from '../errors';
import { useAuth } from '../hooks/useAuth';
import { registerUser } from '../services/authService';
import { PhoneOtpForm } from '../components/PhoneOtpForm';
import { RoleCards } from '../components/RoleCards';
import { RoleSetupForm, type RoleSetupValues } from '../components/RoleSetupForm';
import { CustomerSignupForm } from '../components/signup/CustomerSignupForm';
import { ProviderSignupForm } from '../components/signup/ProviderSignupForm';
import type { LoginRedirectState } from '../components/guards';
import { safeReturnPath } from '../utils/returnPath';
import type { VerifyOtpResult } from '../types';

/** Where to go after verification and onboarding (passed along from the landing page). */
export interface SignupFlowState extends LoginRedirectState {
  /** After verifying: the next step (customer onboarding, vendor setup). */
  next?: string;
}

const isSignupRole = (v: string | undefined): v is SignupRole => SIGNUP_ROLES.some((r) => r === v);

/**
 * /signup — "How will you use Gwani?" → /signup/:role, that role's form. The ONE signup path per role:
 *  - customer: name, email, password → verify the email → short welcome → customer home (or, when they
 *    came from somewhere, e.g. checkout with a guest cart, straight back there, skipping the welcome);
 *  - provider: name, phone, email, location, password, terms → verify the phone → vendor setup → dashboard;
 *  - rider: phone + one-time code → name, area and vehicle → rider home.
 */
export function SignupSection() {
  const { t } = useTranslation('auth');
  const { role } = useParams();
  const { user, homeFor } = useAuth();
  const from = safeReturnPath((useLocation().state as LoginRedirectState | null)?.from);
  const navigate = useNavigate();
  const back = () => navigate(AUTH_ROUTES.signup, { state: { from } satisfies LoginRedirectState });

  if (!role) {
    // Already signed in: nothing to create here.
    if (user) return <Navigate to={from ?? homeFor()} replace />;
    return (
      <div className="space-y-4">
        <LanguageSelector variant="buttons" />
        <RoleCards onSelect={(r) => navigate(AUTH_ROUTES.signupFor(r), { state: { from } satisfies LoginRedirectState })} />
        <p className="text-center text-sm text-muted">
          {t('signup.haveAccount')} <Link to={AUTH_ROUTES.login} state={{ from } satisfies LoginRedirectState} className="font-bold text-pine underline">{t('start.logIn')}</Link>
        </p>
      </div>);

  }
  if (!isSignupRole(role)) return <Navigate to={AUTH_ROUTES.signup} replace />;

  if (role === ROLE.Customer) {
    return (
      <CustomerSignupForm
        onBack={back}
        onDone={() => navigate(AUTH_ROUTES.verifyEmail, { replace: true, state: { from, next: from ?? AUTH_ROUTES.welcome } satisfies SignupFlowState })} />);

  }
  if (role === ROLE.Provider) {
    return (
      <ProviderSignupForm
        onBack={back}
        onDone={() => navigate(AUTH_ROUTES.verifyPhone, { replace: true, state: { next: AUTH_ROUTES.vendorSetup } satisfies SignupFlowState })} />);

  }
  return <RiderSignup onBack={back} />;
}

/** Riders: verify the phone first (it's how they sign in), then their name, area and vehicle. */
function RiderSignup({ onBack }: {onBack: () => void;}) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [verified, setVerified] = useState<Extract<VerifyOtpResult, {status: 'new_user';}> | null>(null);
  const [expired, setExpired] = useState(false);

  function onVerified(result: VerifyOtpResult) {
    // The number already has an account: they're signed in now.
    if (result.status === 'signed_in') navigate(ROLE_META[result.user.activeRole].home, { replace: true });else
    setVerified(result);
  }

  async function submit(values: RoleSetupValues) {
    if (!verified) return;
    try {
      await registerUser({ signupToken: verified.signupToken, role: ROLE.Rider, language: currentLanguage(), name: values.name, rider: values.rider });
      navigate(ROLE_META[ROLE.Rider].home, { replace: true });
    } catch (e) {
      if (isAuthError(e) && e.code === 'signup_expired') setExpired(true);
      throw e;
    }
  }

  if (expired) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-extrabold">{t('signup.expiredTitle')}</h1>
        <p className="text-sm text-muted">{t('signup.expiredBody')}</p>
        <button type="button" onClick={() => {setExpired(false);setVerified(null);}} className="font-bold text-pine underline">{t('signup.startAgain')}</button>
      </div>);

  }
  if (verified) return <RoleSetupForm role={ROLE.Rider} askName submitLabel={t('signup.createAccount')} onSubmit={submit} onBack={() => setVerified(null)} />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('signup.rider.title')}</h1>
      <p className="text-sm text-muted">{t('signup.rider.intro')}</p>
      <PhoneOtpForm onVerified={onVerified} />
      <button type="button" onClick={onBack} className="text-sm font-semibold text-pine underline">{t('common:action.back')}</button>
    </div>);

}
