import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { StatusSteps, type StepState } from '../../../components/ui/StatusSteps';
import { field, label as labelClass, ok, bad } from '../../../components/vendor/formStyles';
import { useToast } from '../../../hooks/useToast';
import { formatLocalPhone, normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { AUTH_ROUTES, PASSWORD, ROLE_META } from '../constants';
import { errorMessage, isAuthError } from '../errors';
import { PASSWORD_RESET } from '../passwordResetConfig';
import { requestPasswordResetOtp, resetPassword, verifyPasswordResetOtp } from '../services/authService';
import { OtpCodeStep } from '../components/OtpCodeStep';
import { PasswordInput } from '../components/PasswordInput';
import { PhoneInput } from '../components/PhoneInput';
import { useOtpFlow, type OtpApi, type OtpFlow } from '../hooks/useOtpFlow';
import type { PasswordResetOutcome, PasswordResetVerifyResult } from '../types';

type Tab = 'phone' | 'email';
type Step = 'identify' | 'code' | 'password' | 'done';
const STEPS: readonly Step[] = ['identify', 'code', 'password', 'done'];

/** Router state from the login screen: open on the tab they were using. */
export interface PasswordResetState {
  tab?: Tab;
}

// A quick shape check; the server checks properly.
const looksLikeEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

/**
 * /login/forgot — password reset by one-time code: phone or email → code → new password → done.
 * Says the same thing whether or not an account exists (rules: passwordResetConfig.ts).
 */
export function PasswordResetSection() {
  const { t } = useTranslation('auth');
  const toast = useToast();
  const navigate = useNavigate();
  const initialTab = (useLocation().state as PasswordResetState | null)?.tab ?? 'phone';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [reset, setReset] = useState<PasswordResetVerifyResult | null>(null);
  const [outcome, setOutcome] = useState<PasswordResetOutcome | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  const api = useMemo<OtpApi<PasswordResetVerifyResult>>(
    () => ({
      validate: (input) =>
      tab === 'phone' ? phoneError(input) : !input.trim() ? t('passwordReset.enterEmail') : looksLikeEmail(input) ? null : t('error.invalidEmail'),
      normalize: (input) => tab === 'phone' ? normalizeNigerianPhone(input) : input.trim().toLowerCase(),
      request: (input) => requestPasswordResetOtp(input).then((r) => ({ target: r.identifier, expiresAt: r.expiresAt, resendAvailableAt: r.resendAvailableAt, devCode: r.devCode })),
      verify: verifyPasswordResetOtp
    }),
    [tab, t]
  );
  const flow = useOtpFlow<PasswordResetVerifyResult>({ api });

  const step: Step = outcome ? 'done' : reset ? 'password' : flow.step === 'code' ? 'code' : 'identify';
  const current = STEPS.indexOf(step);

  // Each step starts with its first field focused (keyboard and screen-reader users land in the right place).
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      stepRef.current?.querySelector<HTMLElement>('input:not([disabled]):not([readonly]), a[href], button:not([disabled])')?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [step, tab]);

  /** The reset token ran out (or was used): start again from step 1, saying why. */
  function restart(message: string) {
    setReset(null);
    flow.changeTarget();
    flow.setProblem({ kind: 'reset_expired', message, attemptsLeft: null });
    toast.error(message);
  }

  const shown = (target: string) => tab === 'phone' ? formatLocalPhone(target) : target;
  const progress = STEPS.map((s, i) => ({
    key: s,
    label: t(`passwordReset.step.${s}`),
    state: (i < current || step === 'done' ? 'done' : i === current ? 'current' : 'upcoming') as StepState,
    at: null
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{t('passwordReset.title')}</h1>
      <StatusSteps steps={progress} label={t('passwordReset.progress')} />

      <div ref={stepRef} className="space-y-4">
        <h2 className="text-lg font-bold">{t(`passwordReset.heading.${step}`)}</h2>

        {step === 'identify' &&
        <IdentifyStep
          tab={tab}
          onTabChange={(next) => {
            setTab(next);
            flow.setInput('');
            flow.setProblem(null);
          }}
          flow={flow} />

        }

        {step === 'code' && flow.target &&
        <OtpCodeStep
          flow={flow}
          sentTo={<Trans t={t} i18nKey="passwordReset.sentTo" values={{ target: shown(flow.target), minutes: PASSWORD_RESET.otp.expiresMinutes }} components={{ strong: <strong /> }} />}
          changeLabel={tab === 'phone' ? t('otp.changeNumber') : t('passwordReset.changeEmail')}
          onVerified={setReset} />

        }

        {step === 'password' && reset &&
        <NewPasswordStep
          resetToken={reset.resetToken}
          onExpired={restart}
          onDone={(result) => {
            setOutcome(result);
            toast.success(t('passwordReset.toastChanged'));
          }} />

        }

        {step === 'done' && outcome &&
        <div className="space-y-4">
            <p role="status" className="flex items-start gap-3 rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
              <CheckCircle2Icon className="mt-0.5 h-5 w-5 shrink-0 text-pine" aria-hidden="true" />
              <span>{outcome.status === 'signed_in' ? t('passwordReset.doneSignedIn') : t('passwordReset.done')}</span>
            </p>
            {outcome.status === 'signed_in' ?
          <Button fullWidth onClick={() => navigate(ROLE_META[outcome.user.activeRole].home, { replace: true })}>{t('passwordReset.continue')}</Button> :

          <Link to={AUTH_ROUTES.login} replace className={buttonClasses({ fullWidth: true })}>{t('passwordReset.logIn')}</Link>
          }
          </div>
        }
      </div>

      {step !== 'done' &&
      <Link to={AUTH_ROUTES.login} className="block text-center text-sm font-semibold text-pine underline underline-offset-2">{t('passwordReset.backToSignIn')}</Link>
      }
    </div>);

}

function IdentifyStep({ tab, onTabChange, flow }: {tab: Tab;onTabChange: (tab: Tab) => void;flow: OtpFlow<PasswordResetVerifyResult>;}) {
  const { t } = useTranslation('auth');
  const locked = flow.lockedFor > 0;
  // Locked, or a request limit was hit: wait until it lifts (the message says how long).
  const limited = flow.resendIn > 0 && (flow.problem?.kind === 'resend_limit' || flow.problem?.kind === 'rate_limited');
  const time = (s: number) => s >= 60 ? t('otp.minutes', { count: Math.ceil(s / 60) }) : t('otp.seconds', { count: s });
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void flow.send();
      }}
      className="space-y-4">

      <p className="text-sm text-muted">{t('passwordReset.intro')}</p>
      <SegmentedControl<Tab> label={t('passwordReset.tabsLabel')} options={[{ id: 'phone', label: t('login.tabPhone') }, { id: 'email', label: t('login.tabEmail') }]} value={tab} onChange={onTabChange} fill />
      {tab === 'phone' ?
      <PhoneInput value={flow.input} onChange={flow.setInput} error={flow.inputError} /> :

      <div>
          <label htmlFor="reset-email" className={labelClass}>{t('email.label')}</label>
          <input
          id="reset-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={flow.input}
          onChange={(e) => flow.setInput(e.target.value)}
          aria-invalid={!!flow.inputError || undefined}
          aria-describedby={flow.inputError ? 'reset-email-error' : undefined}
          className={`${field} ${flow.inputError ? bad : ok}`} />

          {flow.inputError && <p id="reset-email-error" role="alert" className="mt-1 text-sm font-medium text-clay-dark">{flow.inputError}</p>}
        </div>
      }
      {flow.problem &&
      <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{flow.problem.message}</p>
      }
      <Button type="submit" fullWidth loading={flow.sending} disabled={locked || limited}>
        {flow.sending ? t('otp.sending') : locked ? t('otp.lockedFor', { time: time(flow.lockedFor) }) : t('passwordReset.send')}
      </Button>
      <p className="text-xs text-muted">{tab === 'phone' ? t('otp.smsNote', { length: PASSWORD_RESET.otp.length }) : t('passwordReset.emailNote', { length: PASSWORD_RESET.otp.length })}</p>
    </form>);

}

function NewPasswordStep({ resetToken, onExpired, onDone }: {resetToken: string;onExpired: (message: string) => void;onDone: (outcome: PasswordResetOutcome) => void;}) {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const weak = password.length < PASSWORD.minLength ? t('error.passwordMin', { min: PASSWORD.minLength }) : null;
    const mismatch = !weak && password !== confirm ? t('passwordReset.mismatch') : null;
    setPasswordError(weak);
    setConfirmError(mismatch);
    setFormError(null);
    if (weak || mismatch) return;
    setBusy(true);
    try {
      onDone(await resetPassword(resetToken, password));
    } catch (err) {
      if (isAuthError(err) && err.code === 'reset_expired') return onExpired(err.message);
      if (isAuthError(err) && (err.code === 'weak_password' || err.code === 'same_password')) setPasswordError(err.message);else
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">{t('passwordReset.passwordIntro', { minutes: PASSWORD_RESET.token.expiresMinutes })}</p>
      <PasswordInput
        value={password}
        onChange={(v) => {
          setPassword(v);
          setPasswordError(null);
        }}
        label={t('passwordReset.newPassword')}
        autoComplete="new-password"
        showStrength
        error={passwordError} />

      <PasswordInput
        value={confirm}
        onChange={(v) => {
          setConfirm(v);
          setConfirmError(null);
        }}
        label={t('passwordReset.confirmPassword')}
        autoComplete="new-password"
        error={confirmError} />

      {formError && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{formError}</p>}
      <Button type="submit" fullWidth loading={busy}>{busy ? t('passwordReset.saving') : t('passwordReset.save')}</Button>
    </form>);

}
