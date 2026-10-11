import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { errorMessage, isAuthError, isNetworkError } from '../errors';
import { requestOtp, verifyOtp } from '../services/authService';
import type { AuthErrorCode, VerifyOtpResult } from '../types';

export type OtpProblem = {kind: AuthErrorCode | 'network';message: string;attemptsLeft: number | null;};

/** Where codes go and how they're checked. The default is phone sign-in; password reset passes its own. */
export interface OtpApi<R> {
  /** A message for input that can't be sent to, or null. */
  validate: (input: string) => string | null;
  /** The form the server will answer with (to keep going after "resend too soon"), or null. */
  normalize: (input: string) => string | null;
  request: (input: string) => Promise<{target: string;expiresAt: string;resendAvailableAt: string;devCode: string | null;}>;
  verify: (target: string, code: string) => Promise<R>;
}

/** Phone sign-in. `remember`: keep this device signed in (the default for phone sign-in). */
export function phoneSignInOtp(remember: boolean): OtpApi<VerifyOtpResult> {
  return {
    validate: phoneError,
    normalize: normalizeNigerianPhone,
    request: (input) => requestOtp(input).then((r) => ({ ...r, target: r.phone })),
    verify: (phone, code) => verifyOtp(phone, code, { remember })
  };
}

export const PHONE_SIGN_IN_OTP = phoneSignInOtp(true);

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

interface OtpFlowOptions<R> {
  /** Pre-filled phone or email. */
  initialInput?: string;
  api?: OtpApi<R>;
}

/**
 * THE one-time-code flow (signup, login, claiming an invited profile, and password reset): enter a phone
 * (or email) → send a code → enter it. Tracks sending/verifying, the resend timer, expiry, wrong codes
 * with attempts left, the lockout, resend limits and network errors.
 */
export function useOtpFlow<R = VerifyOtpResult>({ initialInput = '', api }: OtpFlowOptions<R> = {}) {
  const apiRef = useRef((api ?? PHONE_SIGN_IN_OTP) as OtpApi<R>);
  apiRef.current = (api ?? PHONE_SIGN_IN_OTP) as OtpApi<R>;
  const [input, setInputValue] = useState(initialInput);
  const [target, setTarget] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [problem, setProblem] = useState<OtpProblem | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  // Bumped on every code sent, so the boxes clear even when there's no dev code to watch.
  const [sentCount, setSentCount] = useState(0);

  const resendIn = useSecondsUntil(resendAt);
  const expiresIn = useSecondsUntil(expiresAt);
  const lockedFor = useSecondsUntil(lockedUntil);

  const fail = useCallback((e: unknown) => {
    if (isNetworkError(e)) return setProblem({ kind: 'network', message: errorMessage(e), attemptsLeft: null });
    if (isAuthError(e)) {
      if ((e.code === 'locked' || e.code === 'resend_too_soon' || e.code === 'resend_limit' || e.code === 'rate_limited') && e.retryAfterSeconds) {
        const until = new Date(Date.now() + e.retryAfterSeconds * 1000).toISOString();
        if (e.code === 'locked') setLockedUntil(until);else
        setResendAt(until);
      }
      return setProblem({ kind: e.code, message: e.message, attemptsLeft: e.attemptsLeft });
    }
    setProblem({ kind: 'invalid_input', message: errorMessage(e), attemptsLeft: null });
  }, []);

  const send = useCallback(async () => {
    const message = apiRef.current.validate(input);
    setInputError(message);
    if (message) return false;
    setSending(true);
    setProblem(null);
    try {
      const r = await apiRef.current.request(input);
      setTarget(r.target);
      setExpiresAt(r.expiresAt);
      setResendAt(r.resendAvailableAt);
      setDevCode(r.devCode);
      setSentCount((n) => n + 1);
      return true;
    } catch (e) {
      fail(e);
      // Already asked recently: the code that's out still works.
      if (isAuthError(e) && e.code === 'resend_too_soon') setTarget(apiRef.current.normalize(input));
      return false;
    } finally {
      setSending(false);
    }
  }, [input, fail]);

  const verify = useCallback(async (code: string): Promise<R | null> => {
    if (!target) return null;
    setVerifying(true);
    setProblem(null);
    try {
      return await apiRef.current.verify(target, code);
    } catch (e) {
      fail(e);
      return null;
    } finally {
      setVerifying(false);
    }
  }, [target, fail]);

  /** Back to the first step (change number/email, or start over). */
  const changeTarget = useCallback(() => {
    setTarget(null);
    setProblem(null);
    setExpiresAt(null);
    setDevCode(null);
  }, []);

  return {
    step: target ? 'code' as const : 'input' as const,
    input,
    setInput: (v: string) => {
      setInputValue(v);
      setInputError(null);
    },
    target,
    inputError,
    problem,
    /** Show a message from the screen (e.g. "your reset session expired") in the same place as flow problems. */
    setProblem,
    sending,
    verifying,
    resendIn,
    expired: !!expiresAt && expiresIn === 0,
    lockedFor,
    devCode,
    sentCount,
    send,
    verify,
    changeTarget
  };
}

export type OtpFlow<R = VerifyOtpResult> = ReturnType<typeof useOtpFlow<R>>;
