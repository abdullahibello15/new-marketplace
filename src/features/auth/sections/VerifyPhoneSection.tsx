import { useEffect, useMemo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { useToast } from '../../../hooks/useToast';
import { formatLocalPhone, normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { AUTH_ROUTES, ROLE } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useOtpFlow, type OtpApi } from '../hooks/useOtpFlow';
import { sendPhoneCode, verifyPhone } from '../services/accountService';
import { OtpCodeStep } from '../components/OtpCodeStep';
import { PhoneInput } from '../components/PhoneInput';
import type { SignupFlowState } from './SignupSection';
import type { User } from '../types';

/**
 * /account/verify-phone — the one-time code by SMS. Providers right after signup (their business is
 * hidden from customers until this is done; they can still finish setup first), and anyone adding or
 * changing a number later (customers need one for SMS reminders and cash or delivery orders).
 */
export function VerifyPhoneSection() {
  const { t } = useTranslation('auth');
  const { user, homeFor } = useAuth();
  const state = useLocation().state as SignupFlowState | null;
  const navigate = useNavigate();
  const toast = useToast();
  // A provider without a vendor profile goes on to vendor setup.
  const next = state?.next ?? (user?.roles.includes(ROLE.Provider) && !user.vendorId ? AUTH_ROUTES.vendorSetup : homeFor());
  const goNext = () => navigate(next, { replace: true });

  const api = useMemo<OtpApi<User>>(() => ({
    validate: phoneError,
    normalize: normalizeNigerianPhone,
    request: (phone) => sendPhoneCode(phone),
    verify: (_target, code) => verifyPhone(code)
  }), []);
  const flow = useOtpFlow<User>({ initialInput: user?.phone ? formatLocalPhone(user.phone) : '', api });

  // The account already has a number (providers): send the code straight away.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !user?.phone || user.phoneVerified) return;
    sent.current = true;
    void flow.send();
  }, [user, flow]);

  if (!user) return null;

  if (user.phone && user.phoneVerified && flow.step === 'input') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">{t('verify.phone.doneTitle')}</h1>
        <p className="text-sm text-muted">{t('verify.phone.doneText', { phone: formatLocalPhone(user.phone) })}</p>
        <Link to={next} replace className={buttonClasses({ fullWidth: true })}>{t('verify.continue')}</Link>
      </div>);

  }

  const provider = user.roles.includes(ROLE.Provider);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{user.phone ? t('verify.phone.title') : t('verify.phone.addTitle')}</h1>
      <p className="text-sm text-muted">{provider ? t('verify.phone.introProvider') : t('verify.phone.introCustomer')}</p>
      {flow.step === 'code' ?
      <OtpCodeStep
        flow={flow}
        sentTo={<Trans t={t} i18nKey="otp.sentTo" values={{ phone: formatLocalPhone(flow.target ?? '') }} components={{ strong: <strong /> }} />}
        changeLabel={t('otp.changeNumber')}
        onVerified={() => {
          toast.success(t('verify.phone.toast'));
          goNext();
        }} /> :

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void flow.send();
        }}
        className="space-y-3">

          <PhoneInput value={flow.input} onChange={flow.setInput} error={flow.inputError} autoFocus />
          {flow.problem && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{flow.problem.message}</p>}
          <Button type="submit" fullWidth loading={flow.sending} disabled={flow.lockedFor > 0}>{flow.sending ? t('otp.sending') : t('otp.send')}</Button>
        </form>
      }
      <button type="button" onClick={goNext} className="block w-full text-center text-sm font-semibold text-pine underline underline-offset-2">{t('verify.later')}</button>
      {provider && <p className="text-xs text-muted">{t('verify.phone.laterNote')}</p>}
    </div>);

}
