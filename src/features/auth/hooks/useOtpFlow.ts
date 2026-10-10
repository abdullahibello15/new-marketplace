import { useCallback, useEffect, useState } from 'react';
import { normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { errorMessage, isAuthError, isNetworkError } from '../errors';
import { requestOtp, verifyOtp } from '../services/authService';
import type { AuthErrorCode, VerifyOtpResult } from '../types';

export type OtpProblem = {kind: AuthErrorCode | 'network';message: string;attemptsLeft: number | null;};

/** Seconds left until `iso` (0 when passed), refreshed every second while a code is out. */
function useSecondsUntil(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0;
}

/**
 * THE one-time-code flow (customer and provider signup, login, and claiming an invited profile): enter a
 * phone → send a code → enter it. Tracks sending/verifying, the resend timer, expiry, wrong codes with
 * attempts left, the lockout, and network errors.
 */
export function useOtpFlow({ initialPhone = '' }: {initialPhone?: string;} = {}) {
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [phone, setPhone] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [problem, setProblem] = useState<OtpProblem | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const resendIn = useSecondsUntil(resendAt);
  const expiresIn = useSecondsUntil(expiresAt);
  const lockedFor = useSecondsUntil(lockedUntil);

  const fail = useCallback((e: unknown) => {
    if (isNetworkError(e)) return setProblem({ kind: 'network', message: errorMessage(e), attemptsLeft: null });
    if (isAuthError(e)) {
      if ((e.code === 'locked' || e.code === 'resend_too_soon') && e.retryAfterSeconds) {
        const until = new Date(Date.now() + e.retryAfterSeconds * 1000).toISOString();
        if (e.code === 'locked') setLockedUntil(until);else
        setResendAt(until);
      }
      return setProblem({ kind: e.code, message: e.message, attemptsLeft: e.attemptsLeft });
    }
    setProblem({ kind: 'invalid_input', message: errorMessage(e), attemptsLeft: null });
  }, []);

  const send = useCallback(async () => {
    const message = phoneError(phoneInput);
    setInputError(message);
    if (message) return false;
    setSending(true);
    setProblem(null);
    try {
      const r = await requestOtp(phoneInput);
      setPhone(r.phone);
      setExpiresAt(r.expiresAt);
      setResendAt(r.resendAvailableAt);
      setDevCode(r.devCode);
      return true;
    } catch (e) {
      fail(e);
      // Already asked recently: the code that's out still works.
      if (isAuthError(e) && e.code === 'resend_too_soon') setPhone(normalizeNigerianPhone(phoneInput));
      return false;
    } finally {
      setSending(false);
    }
  }, [phoneInput, fail]);

  const verify = useCallback(async (code: string): Promise<VerifyOtpResult | null> => {
    if (!phone) return null;
    setVerifying(true);
    setProblem(null);
    try {
      return await verifyOtp(phone, code);
    } catch (e) {
      fail(e);
      return null;
    } finally {
      setVerifying(false);
    }
  }, [phone, fail]);

  const changeNumber = useCallback(() => {
    setPhone(null);
    setProblem(null);
    setExpiresAt(null);
    setDevCode(null);
  }, []);

  return {
    step: phone ? 'code' as const : 'phone' as const,
    phoneInput,
    setPhoneInput: (v: string) => {
      setPhoneInput(v);
      setInputError(null);
    },
    phone,
    inputError,
    problem,
    sending,
    verifying,
    resendIn,
    expired: !!expiresAt && expiresIn === 0,
    lockedFor,
    devCode,
    send,
    verify,
    changeNumber
  };
}
