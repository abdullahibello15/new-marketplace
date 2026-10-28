import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { bad, field, ok } from '../../../components/vendor/formStyles';
import { formatLocalPhone } from '../../../utils/phone';
import { MOCK_DEMO_PASSWORD } from '../config';
import { AUTH_ROUTES, ROLE_META } from '../constants';
import { SESSION_TIMING } from '../sessionConfig';
import { errorMessage } from '../errors';
import { useAuth } from '../hooks/useAuth';
import { passwordLoginSchema, type PasswordLoginData, type PasswordLoginValues } from '../schemas';
import { loginWithPassword } from '../services/authService';
import { DemoAccountsPanel } from '../components/DemoAccountsPanel';
import { PasswordInput } from '../components/PasswordInput';
import { PhoneOtpForm } from '../components/PhoneOtpForm';
import { safeReturnPath } from '../utils/returnPath';
import type { LoginRedirectState } from '../components/guards';
import type { DemoAccount } from '../mock/demoAccounts';
import type { VerifyOtpResult } from '../types';
import type { PasswordResetState } from './PasswordResetSection';

/** Password: customers (email) and providers (phone or email). Code: riders and staff (phone + one-time code). */
type Tab = 'password' | 'code';

/** Router state the login page reads: where to go afterwards, and why they were signed out. */
export type LoginPageState = LoginRedirectState;

/** "Keep me signed in", with what it means for this sign-in method. */
function RememberMe({ tab, checked, onChange }: {tab: Tab;checked: boolean;onChange: (v: boolean) => void;}) {
  const { t } = useTranslation('auth');
  const days = Math.round(SESSION_TIMING.rememberSeconds / 86_400);
  const staffHours = Math.round(SESSION_TIMING.adminSessionSeconds / 3600);
  return (
    <div className="rounded-xl bg-sand px-3 py-2.5">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby="remember-note" className="h-5 w-5 shrink-0 accent-pine" />
        {t('login.remember')}
      </label>
      <p id="remember-note" className="mt-1 text-xs text-muted">
        {checked ? tab === 'code' ? t('login.rememberPhoneNote', { days }) : t('login.rememberOnNote', { days }) : t('login.rememberOffNote')}{' '}
        {t('login.rememberStaffNote', { hours: staffHours })}
      </p>
    </div>);

}

/** Email or phone number in one field, and the password. One message for any wrong combination. */
function PasswordLogin({ onSignedIn, remember, defaults }: {onSignedIn: (home: string) => void;remember: boolean;defaults: PasswordLoginValues;}) {
  const { t } = useTranslation('auth');
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordLoginValues, unknown, PasswordLoginData>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: defaults
  });

  const submit = handleSubmit(async ({ identifier, password }) => {
    setError(null);
    try {
      const user = await loginWithPassword(identifier, password, { remember });
      onSignedIn(ROLE_META[user.activeRole].home);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <FormField id="login-identifier" label={t('login.identifier')} hint={t('login.identifierHint')} error={errors.identifier?.message}>
        {(describedBy) =>
        <input
          id="login-identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          {...register('identifier')}
          aria-invalid={!!errors.identifier || undefined}
          aria-describedby={describedBy}
          className={`${field} ${errors.identifier ? bad : ok}`} />

        }
      </FormField>
      <Controller
        control={control}
        name="password"
        render={({ field: f }) => <PasswordInput value={f.value} onChange={f.onChange} autoComplete="current-password" error={errors.password?.message} />} />

      {error && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{error}</p>}
      <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{t('login.signIn')}</Button>
      <p className="text-sm">
        <Link to={AUTH_ROUTES.forgotPassword} state={{ tab: 'email' } satisfies PasswordResetState} className="font-semibold text-pine underline underline-offset-2">{t('login.forgot')}</Link>
      </p>
    </form>);

}

/**
 * /login — Password (default): customers with their email, providers with their phone or email.
 * Phone code: riders and Gwani staff (and anyone who'd rather get a code). Afterwards, back to where they
 * were going, or their active role's home. New here? → signup (one path per role).
 */
export function LoginSection() {
  const { t } = useTranslation('auth');
  const { user, homeFor } = useAuth();
  const navigate = useNavigate();
  const redirect = useLocation().state as LoginPageState | null;
  const from = safeReturnPath(redirect?.from);
  const [tab, setTab] = useState<Tab>('password');
  // Phone codes remember this device by default; password sign-in doesn't.
  const [remember, setRemember] = useState<Record<Tab, boolean>>({ password: false, code: true });
  const [noAccount, setNoAccount] = useState(false);
  // The demo panel fills the form; the key makes the form start again with those values.
  const [demo, setDemo] = useState<{key: number;identifier: string;password: string;phone: string;}>({ key: 0, identifier: '', password: '', phone: '' });

  if (user) return <Navigate to={from ?? homeFor()} replace />;

  function onCodeVerified(result: VerifyOtpResult) {
    if (result.status === 'signed_in') navigate(from ?? ROLE_META[result.user.activeRole].home, { replace: true });else
    setNoAccount(true);
  }

  function fillDemo(a: DemoAccount) {
    setNoAccount(false);
    setTab(a.login);
    const identifier = a.identifier.includes('@') ? a.identifier : formatLocalPhone(a.identifier);
    setDemo((d) => ({ key: d.key + 1, identifier: a.login === 'password' ? identifier : '', password: a.login === 'password' ? MOCK_DEMO_PASSWORD : '', phone: a.login === 'code' ? identifier : '' }));
  }

  return (
    <div className="space-y-5">
      <LanguageSelector variant="buttons" />
      <div>
        <h1 className="text-2xl font-extrabold">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('login.intro')}</p>
      </div>
      {redirect?.reason &&
      <p role="status" className="rounded-xl bg-[#FBEFD2] px-4 py-3 text-sm font-medium text-mustard-dark">{t(`session.ended.${redirect.reason}`)}</p>
      }
      <SegmentedControl<Tab>
        label={t('login.tabsLabel')}
        options={[{ id: 'password', label: t('login.tabPassword') }, { id: 'code', label: t('login.tabCode') }]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setNoAccount(false);
        }}
        fill />

      {tab === 'password' ?
      <PasswordLogin key={`pw-${demo.key}`} defaults={{ identifier: demo.identifier, password: demo.password }} onSignedIn={(home) => navigate(from ?? home, { replace: true })} remember={remember.password} /> :

      <>
          <p className="text-sm text-muted">{t('login.codeIntro')}</p>
          <PhoneOtpForm key={`code-${demo.key}`} initialPhone={demo.phone} onVerified={onCodeVerified} remember={remember.code} />
        </>
      }
      {noAccount &&
      <p role="status" className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
          {t('login.noAccount')}{' '}
          <Link to={AUTH_ROUTES.signup} state={{ from } satisfies LoginRedirectState} className="font-bold text-pine underline">{t('start.createAccount')}</Link>
        </p>
      }
      <RememberMe tab={tab} checked={remember[tab]} onChange={(v) => setRemember((r) => ({ ...r, [tab]: v }))} />
      <p className="text-center text-sm text-muted">
        {t('login.newHere')} <Link to={AUTH_ROUTES.signup} state={{ from } satisfies LoginRedirectState} className="font-bold text-pine underline">{t('start.createAccount')}</Link>
      </p>

      <DemoAccountsPanel onUse={fillDemo} />
    </div>);

}
