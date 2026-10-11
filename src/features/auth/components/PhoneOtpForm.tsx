import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { formatLocalPhone } from '../../../utils/phone';
import { OTP } from '../constants';
import { phoneSignInOtp, useOtpFlow } from '../hooks/useOtpFlow';
import { OtpCodeStep } from './OtpCodeStep';
import { PhoneInput } from './PhoneInput';
import type { VerifyOtpResult } from '../types';

interface PhoneOtpFormProps {
  onVerified: (result: VerifyOtpResult) => void;
  /** Pre-filled number (e.g. from an invitation link). */
  initialPhone?: string;
  /** The number can't be changed (the invitation is for this number). */
  lockPhone?: boolean;
  sendLabel?: string;
  /** Keep this device signed in after a successful sign-in (default yes). */
  remember?: boolean;
}

/**
 * Phone number → one-time code, for sign-in, signup and claiming a profile (one shared component and
 * hook, so every place behaves the same). An existing number signs in; a new one continues to signup.
 */
export function PhoneOtpForm({ onVerified, initialPhone = '', lockPhone = false, sendLabel, remember = true }: PhoneOtpFormProps) {
  const { t } = useTranslation('auth');
  const api = useMemo(() => phoneSignInOtp(remember), [remember]);
  const flow = useOtpFlow({ initialInput: initialPhone, api });
  const locked = flow.lockedFor > 0;
  const time = (s: number) => s >= 60 ? t('otp.minutes', { count: Math.ceil(s / 60) }) : t('otp.seconds', { count: s });

  if (flow.step === 'input') {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void flow.send();
        }}
        className="space-y-4">

        <PhoneInput value={flow.input} onChange={flow.setInput} error={flow.inputError} readOnly={lockPhone} autoFocus={!lockPhone} />
        {flow.problem &&
        <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{flow.problem.message}</p>
        }
        <Button type="submit" fullWidth loading={flow.sending} disabled={locked}>
          {flow.sending ? t('otp.sending') : locked ? t('otp.lockedFor', { time: time(flow.lockedFor) }) : sendLabel ?? t('otp.send')}
        </Button>
        <p className="text-xs text-muted">{t('otp.smsNote', { length: OTP.length })}</p>
      </form>);

  }

  return (
    <OtpCodeStep
      flow={flow}
      sentTo={<Trans t={t} i18nKey="otp.sentTo" values={{ phone: formatLocalPhone(flow.target ?? '') }} components={{ strong: <strong /> }} />}
      changeLabel={lockPhone ? undefined : t('otp.changeNumber')}
      onVerified={onVerified} />);

}
