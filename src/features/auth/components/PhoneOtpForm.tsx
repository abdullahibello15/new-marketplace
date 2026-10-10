import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { formatLocalPhone } from '../../../utils/phone';
import { MOCK_AUTH } from '../config';
import { OTP } from '../constants';
import { useOtpFlow } from '../hooks/useOtpFlow';
import { OtpInput } from './OtpInput';
import { PhoneInput } from './PhoneInput';
import type { VerifyOtpResult } from '../types';

interface PhoneOtpFormProps {
  onVerified: (result: VerifyOtpResult) => void;
  /** Pre-filled number (e.g. from an invitation link). */
  initialPhone?: string;
  /** The number can't be changed (the invitation is for this number). */
  lockPhone?: boolean;
  sendLabel?: string;
}

/**
 * Phone number → one-time code, for sign-in, signup and claiming a profile (one shared component and
 * hook, so every place behaves the same). An existing number signs in; a new one continues to signup.
 */
export function PhoneOtpForm({ onVerified, initialPhone = '', lockPhone = false, sendLabel }: PhoneOtpFormProps) {
  const { t } = useTranslation('auth');
  const flow = useOtpFlow({ initialPhone });
  const [code, setCode] = useState('');
  const locked = flow.lockedFor > 0;
  const time = (s: number) => s >= 60 ? t('otp.minutes', { count: Math.ceil(s / 60) }) : t('otp.seconds', { count: s });

  // A new code clears the boxes.
  useEffect(() => setCode(''), [flow.devCode]);

  async function submit(value = code) {
    if (value.length !== OTP.length || flow.verifying) return;
    const result = await flow.verify(value);
    if (result) onVerified(result);else
    setCode('');
  }

  if (flow.step === 'phone') {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void flow.send();
        }}
        className="space-y-4">

        <PhoneInput value={flow.phoneInput} onChange={flow.setPhoneInput} error={flow.inputError} readOnly={lockPhone} autoFocus={!lockPhone} />
        {flow.problem &&
        <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{flow.problem.message}</p>
        }
        <Button type="submit" fullWidth loading={flow.sending} disabled={locked}>
          {flow.sending ? t('otp.sending') : locked ? t('otp.lockedFor', { time: time(flow.lockedFor) }) : sendLabel ?? t('otp.send')}
        </Button>
        <p className="text-xs text-muted">{t('otp.smsNote', { length: OTP.length })}</p>
      </form>);

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
        <Trans t={t} i18nKey="otp.sentTo" values={{ phone: formatLocalPhone(flow.phone ?? '') }} components={{ strong: <strong /> }} />{' '}
        {!lockPhone &&
        <button type="button" onClick={flow.changeNumber} className="font-semibold text-pine underline underline-offset-2">
            {t('otp.changeNumber')}
          </button>
        }
      </p>
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
        <p className="text-muted">{t('otp.resendIn', { seconds: flow.resendIn })}</p> :

        <button type="button" disabled={flow.sending || locked} onClick={() => void flow.send()} className="font-semibold text-pine underline underline-offset-2 disabled:opacity-50">
            {flow.sending ? t('otp.resending') : t('otp.resend')}
          </button>
        }
      </div>
      {MOCK_AUTH && flow.devCode &&
      <p className="rounded-xl border border-dashed border-mustard bg-[#FBF3DC] px-3 py-2 text-xs">
          <Trans t={t} i18nKey="otp.devCode" values={{ code: flow.devCode }} components={{ strong: <strong />, code: <code className="font-bold" /> }} />
        </p>
      }
    </form>);

}
