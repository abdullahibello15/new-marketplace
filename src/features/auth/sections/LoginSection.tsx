import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { roleLabel } from '../../../i18n/labels';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { formatLocalPhone } from '../../../utils/phone';
import { MOCK_AUTH } from '../config';
import { AUTH_ROUTES, ROLE_META } from '../constants';
import { errorMessage } from '../errors';
import { useAuth } from '../hooks/useAuth';
import { seedUsers } from '../mock/users';
import { loginWithEmail } from '../services/authService';
import { PasswordInput } from '../components/PasswordInput';
import { PhoneOtpForm } from '../components/PhoneOtpForm';
import type { LoginRedirectState } from '../components/guards';
import type { VerifyOtpResult } from '../types';

type Tab = 'phone' | 'email';

/** State handed to the signup page after a new number is verified. */
export interface SignupState {
  signupToken: string;
  phone: string;
  from?: string;
}

function EmailLogin({ onSignedIn }: {onSignedIn: (home: string) => void;}) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError(t('login.missingFields'));
    setBusy(true);
    setError(null);
    try {
      const user = await loginWithEmail(email, password);
      onSignedIn(ROLE_META[user.activeRole].home);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className={labelClass}>{t('email.label')}</label>
        <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} ${ok}`} />
      </div>
      <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{error}</p>}
      <Button type="submit" fullWidth loading={busy}>{t('login.signIn')}</Button>
      <p className="flex flex-wrap justify-between gap-2 text-sm">
        <Link to={AUTH_ROUTES.forgotPassword} className="font-semibold text-pine underline underline-offset-2">{t('login.forgot')}</Link>
        <span className="text-muted">{t('login.emailNote')}</span>
      </p>
    </form>);

}

/**
 * /login — Phone (default) or Email. With a phone, a known number signs in and a new one goes on to
 * signup, so it's also the start of signup. Afterwards, back to where they were going, or their last
 * role's home.
 */
export function LoginSection() {
  const { t } = useTranslation('auth');
  const { user, homeFor } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as LoginRedirectState | null)?.from;
  const [tab, setTab] = useState<Tab>('phone');
  const [demoPhone, setDemoPhone] = useState('');

  if (user) return <Navigate to={from ?? homeFor()} replace />;

  function onVerified(result: VerifyOtpResult) {
    if (result.status === 'signed_in') navigate(from ?? ROLE_META[result.user.activeRole].home, { replace: true });else
    navigate(AUTH_ROUTES.signup, { replace: true, state: { signupToken: result.signupToken, phone: result.phone, from } satisfies SignupState });
  }

  return (
    <div className="space-y-5">
      <LanguageSelector variant="buttons" />
      <div>
        <h1 className="text-2xl font-extrabold">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('login.intro')}</p>
      </div>
      <SegmentedControl<Tab> label={t('login.tabsLabel')} options={[{ id: 'phone', label: t('login.tabPhone') }, { id: 'email', label: t('login.tabEmail') }]} value={tab} onChange={setTab} fill />
      {tab === 'phone' ?
      <PhoneOtpForm key={demoPhone} initialPhone={demoPhone} onVerified={onVerified} /> :
      <EmailLogin onSignedIn={(home) => navigate(from ?? home, { replace: true })} />
      }

      {MOCK_AUTH &&
      <section aria-labelledby="demo-heading" className="rounded-xl border border-dashed border-mustard bg-[#FBF3DC] p-3 text-xs">
          <h2 id="demo-heading" className="font-bold">{t('dev.demoTitle')}</h2>
          <p className="mt-0.5 text-muted">{t('dev.demoHint')}</p>
          <ul className="mt-2 grid gap-1">
            {seedUsers(() => '').map((u) =>
          <li key={u.id}>
                <button
              type="button"
              onClick={() => {
                setTab('phone');
                setDemoPhone(formatLocalPhone(u.phone));
              }}
              className="flex w-full justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-left hover:bg-sand">

                  <span className="font-semibold">{u.name}</span>
                  <span className="text-muted">{u.roles.map((r) => roleLabel(r)).join(' + ')}</span>
                </button>
              </li>
          )}
          </ul>
        </section>
      }
    </div>);

}
