import { OTP } from './constants';

/*
 * Password reset by one-time code: THE security rules, in one place. The backend (passwordResetBackend.ts),
 * the service and the screens all read this file.
 *
 *  - Never reveal whether an account exists: an unknown phone/email, or an account without a password,
 *    gets the same answer and the same screens, with a decoy challenge (same timers and lockout) that no
 *    code can pass, because none was sent.
 *  - The code is the same as sign-in codes: 6 digits, 5 minutes, one use, 5 wrong tries then a lockout,
 *    a 60-second resend timer; plus a cap on resends per hour.
 *  - A verified code gives a reset token: 10 minutes, one use, tied to the phone/email that was verified.
 *  - The new password follows the usual rules (PASSWORD in constants.ts) and can't be the current one.
 *
 * ⚠️ The rate limits here are MOCKED in the browser. Real limits belong on the backend (per account, per
 * IP and per device fingerprint), where the client can't reset or skip them.
 */
export const PASSWORD_RESET = {
  otp: {
    length: OTP.length,
    expiresMinutes: OTP.expiresMinutes,
    resendSeconds: OTP.resendSeconds,
    maxAttempts: OTP.maxAttempts,
    lockoutMinutes: OTP.lockoutMinutes,
    /** Resends allowed per phone/email in any rolling hour, after the first code. */
    resendsPerHour: 3
  },
  /** The reset token from a verified code. */
  token: { expiresMinutes: 10 },
  /** Code requests from one device (any phone/email) in a rolling window. PLACEHOLDER: confirm against the build spec. */
  deviceLimit: { maxRequests: 10, windowMinutes: 60 },
  /**
   * After the password is changed (every session of the account is signed out either way):
   * 'login' sends them to the login screen; 'sign_in' signs them in on this device.
   */
  afterReset: 'login' as 'login' | 'sign_in'
} as const;
