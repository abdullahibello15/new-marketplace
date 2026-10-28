import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { OTP } from '../constants';
import { OtpInput } from './OtpInput';
import { TestModeOtpBanner } from './TestModeOtpBanner';
import type { OtpFlow } from '../hooks/useOtpFlow';

interface OtpCodeStepProps<R> {
  flow: OtpFlow<R>;
  /** "We sent a code to …" (or the reset flow's "If an account exists…"). */
  sentTo: ReactNode;
  /** Label of the link back to the first step; leave out when the phone/email can't change. */
  changeLabel?: string;
  onVerified: (result: R) => void;
}

/**
 * Entering a one-time code: the digit boxes, checking, wrong code with tries left, expiry, the lockout,
 * the resend timer and, in test mode only, the test-code banner with autofill. Shared by phone sign-in
 * (PhoneOtpForm) and password reset.
 */
export function OtpCodeStep<R>({ flow, sentTo, changeLabel, onVerified }: OtpCodeStepProps<R>) {
  const { t } = useTranslation('auth');
  const [code, setCode] = useState('');
  const locked = flow.lockedFor > 0;
  const time = (s: number) => s >= 60 ? t('otp.minutes', { count: Math.ceil(s / 60) }) : t('otp.seconds', { count: s });

  // A new code clears the boxes.
  useEffect(() => setCode(''), [flow.sentCount]);

  async function submit(value = code) {
    if (value.length !== OTP.length || flow.verifying) return;
    const result = await flow.verify(value);
    if (result) onVerified(result);else
    setCode('');
  }

  const problem = flow.problem;
  const wrong = problem?.kind === 'wrong_code';
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4">

      <p className="text-sm">
        {sentTo}{' '}
        {changeLabel &&
        <button type="button" onClick={flow.changeTarget} className="font-semibold text-pine underline underline-offset-2">
            {changeLabel}
          </button>
        }
      </p>
      <TestModeOtpBanner
        disabled={flow.verifying || locked || flow.expired}
        onAutofill={(testCode) => {
          setCode(testCode);
          void submit(testCode);
        }} />
      <OtpInput
        label={t('otp.enterCode')}
        value={code}
        onChange={setCode}
        onComplete={(v) => void submit(v)}
        disabled={flow.verifying || locked || flow.expired}
        invalid={wrong}
        describedBy="otp-status" />

      <div id="otp-status" aria-live="polite" className="space-y-2 text-sm">
        {flow.verifying && <p className="text-muted">{t('otp.checking')}</p>}
        {problem && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 font-medium text-clay-dark">{problem.message}</p>}
        {flow.expired && !problem && <p className="rounded-xl bg-[#FBEFD2] px-4 py-3 font-medium text-mustard-dark">{t('otp.expired')}</p>}
        {locked && <p className="text-muted">{t('otp.retryIn', { time: time(flow.lockedFor) })}</p>}
      </div>
      <Button type="submit" fullWidth loading={flow.verifying} disabled={code.length !== OTP.length || locked || flow.expired}>
        {t('otp.verify')}
      </Button>
      <div className="text-center text-sm">
        {flow.resendIn > 0 ?
        <p className="text-muted">{flow.resendIn > 60 ? t('otp.resendInLong', { time: time(flow.resendIn) }) : t('otp.resendIn', { seconds: flow.resendIn })}</p> :

        <button type="button" disabled={flow.sending || locked} onClick={() => void flow.send()} className="font-semibold text-pine underline underline-offset-2 disabled:opacity-50">
            {flow.sending ? t('otp.resending') : t('otp.resend')}
          </button>
        }
      </div>
    </form>);

}
