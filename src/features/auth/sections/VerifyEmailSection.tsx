import { useEffect, useMemo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useOtpFlow, type OtpApi } from '../hooks/useOtpFlow';
import { sendEmailCode, verifyEmail } from '../services/accountService';
import { OtpCodeStep } from '../components/OtpCodeStep';
import type { SignupFlowState } from './SignupSection';
import type { User } from '../types';

/**
 * /account/verify-email — a 6-digit code sent to the account's email (the same boxes, timers and limits
 * as phone codes). Customers can browse without it, but booking and paying need it; vendors are asked
 * from a banner. "Later" skips to the next step.
 */
export function VerifyEmailSection() {
  const { t } = useTranslation('auth');
  const { user, homeFor } = useAuth();
  const state = useLocation().state as SignupFlowState | null;
  const navigate = useNavigate();
  const toast = useToast();
  const next = state?.next ?? homeFor();
  const goNext = () => navigate(next, { replace: true, state: { from: state?.from } });

  const api = useMemo<OtpApi<User>>(() => ({
    validate: () => null,
    normalize: (v) => v,
    request: () => sendEmailCode(),
    verify: (_target, code) => verifyEmail(code)
  }), []);
  const flow = useOtpFlow<User>({ initialInput: user?.email ?? '', api });

  // Send the first code as soon as the page opens.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !user?.email || user.emailVerified) return;
    sent.current = true;
    void flow.send();
  }, [user, flow]);

  if (!user) return null;
  if (!user.email) return <Navigate to={next} replace />;

  if (user.emailVerified) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">{t('verify.email.doneTitle')}</h1>
        <p className="text-sm text-muted">{t('verify.email.doneText', { email: user.email })}</p>
        <Link to={next} replace state={{ from: state?.from }} className={buttonClasses({ fullWidth: true })}>{t('verify.continue')}</Link>
      </div>);

  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('verify.email.title')}</h1>
      <p className="text-sm text-muted">{t('verify.email.intro')}</p>
      {flow.step === 'code' ?
      <OtpCodeStep
        flow={flow}
        sentTo={<Trans t={t} i18nKey="verify.email.sentTo" values={{ email: user.email }} components={{ strong: <strong /> }} />}
        onVerified={() => {
          toast.success(t('verify.email.toast'));
          goNext();
        }} /> :

      <div className="space-y-3">
          {flow.problem && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{flow.problem.message}</p>}
          <Button fullWidth loading={flow.sending} onClick={() => void flow.send()}>{flow.sending ? t('otp.sending') : t('verify.email.send')}</Button>
        </div>
      }
      <button type="button" onClick={goNext} className="block w-full text-center text-sm font-semibold text-pine underline underline-offset-2">{t('verify.later')}</button>
      <p className="text-xs text-muted">{t('verify.email.laterNote')}</p>
    </div>);

}
