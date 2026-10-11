import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock mode on, so real accounts get the known test code.
vi.mock('./config', () => ({ MOCK_AUTH: true, MOCK_OTP_CODE: '123456', MOCK_DEMO_PASSWORD: 'demo-pass-0000', MOCK_NETWORK_FAILURE_SUFFIX: '9999' }));

import { AuthError } from './errors';
import { AUTH_MESSAGE_TEMPLATES, renderAuthMessage } from './messageTemplates';
import { DEMO_CUSTOMER } from './mock/users';
import { TEST_DEMO_PASSWORD } from './testMode';
import { PASSWORD_RESET } from './passwordResetConfig';
import { devOutbox, findUser, loginWithPasswordNow, mockHash, resetAuthBackendForTests } from './services/authBackend';
import { createSessionNow, liveSessionsOf, resetSessionBackendForTests } from './services/sessionBackend';
import { requestResetOtpNow, resetPasswordNow, resetPasswordResetForTests, verifyResetOtpNow } from './services/passwordResetBackend';

const t0 = new Date(2026, 9, 10, 10, 0, 0);
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);
const DEVICE = 'device-a';
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AuthError ? e.code : 'other';
  }
  return 'none';
};
/** Sani the rider: an account with no password (riders sign in with phone codes). */
const NO_PASSWORD_PHONE = '0800 000 0004';

beforeEach(() => {
  resetAuthBackendForTests();
  resetPasswordResetForTests();
  resetSessionBackendForTests();
});

describe('never revealing whether an account exists', () => {
  it('answers the same for a real account, an unknown number and an account without a password', () => {
    const shape = (raw: string) => {
      const r = requestResetOtpNow(raw, DEVICE, t0);
      return { channel: r.channel, expires: r.expiresAt, resend: r.resendAvailableAt, devCode: r.devCode };
    };
    expect(shape(DEMO_CUSTOMER.phone)).toEqual(shape('0813 000 1111'));
    expect(shape(NO_PASSWORD_PHONE)).toEqual(shape('0813 000 1111'.replace('1111', '2222')));
  });

  it('only sends a code to a real account with a password', () => {
    requestResetOtpNow('0813 000 1111', DEVICE, t0);
    requestResetOtpNow(NO_PASSWORD_PHONE, DEVICE, t0);
    expect(devOutbox()).toHaveLength(0);
    requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, t0);
    expect(devOutbox()[0]).toMatchObject({ kind: 'reset_code', to: DEMO_CUSTOMER.phone, value: '123456' });
  });

  it('never lets a decoy through, even with the test code', () => {
    requestResetOtpNow('0813 000 1111', DEVICE, t0);
    expect(codeOf(() => verifyResetOtpNow('0813 000 1111', '123456', later(5)))).toBe('wrong_code');
  });

  it('sends by email for a verified email with a password', () => {
    expect(requestResetOtpNow('Aisha@Example.com', DEVICE, t0)).toMatchObject({ identifier: 'aisha@example.com', channel: 'email' });
    expect(devOutbox()[0]).toMatchObject({ kind: 'reset_code', to: 'aisha@example.com' });
  });
});

describe('the reset code', () => {
  it('expires after 5 minutes and works once', () => {
    requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, t0);
    expect(codeOf(() => verifyResetOtpNow(DEMO_CUSTOMER.phone, '123456', later(PASSWORD_RESET.otp.expiresMinutes * 60 + 1)))).toBe('expired');

    requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, later(PASSWORD_RESET.otp.expiresMinutes * 60 + 2));
    expect(verifyResetOtpNow(DEMO_CUSTOMER.phone, '123456', later(PASSWORD_RESET.otp.expiresMinutes * 60 + 5)).resetToken).toBeTruthy();
    expect(codeOf(() => verifyResetOtpNow(DEMO_CUSTOMER.phone, '123456', later(PASSWORD_RESET.otp.expiresMinutes * 60 + 6)))).toBe('no_code');
  });

  it('locks after the maximum wrong attempts', () => {
    requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, t0);
    for (let i = 1; i < PASSWORD_RESET.otp.maxAttempts; i++) expect(codeOf(() => verifyResetOtpNow(DEMO_CUSTOMER.phone, '000000', later(i)))).toBe('wrong_code');
    expect(codeOf(() => verifyResetOtpNow(DEMO_CUSTOMER.phone, '000000', later(20)))).toBe('locked');
    expect(codeOf(() => requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, later(30)))).toBe('locked');
  });

  it('waits 60 seconds between codes and allows 3 resends an hour', () => {
    const gap = PASSWORD_RESET.otp.resendSeconds;
    requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, t0);
    expect(codeOf(() => requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, later(gap - 1)))).toBe('resend_too_soon');
    for (let n = 1; n <= PASSWORD_RESET.otp.resendsPerHour; n++) requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, later(gap * n));
    expect(codeOf(() => requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, later(gap * (PASSWORD_RESET.otp.resendsPerHour + 1))))).toBe('resend_limit');
    expect(requestResetOtpNow(DEMO_CUSTOMER.phone, DEVICE, later(3600 + 1)).channel).toBe('sms');
  });

  it('limits requests per device across numbers', () => {
    for (let i = 0; i < PASSWORD_RESET.deviceLimit.maxRequests; i++) requestResetOtpNow(`0813 000 ${String(1000 + i)}`, DEVICE, later(i));
    expect(codeOf(() => requestResetOtpNow('0813 000 2999', DEVICE, later(30)))).toBe('rate_limited');
    expect(requestResetOtpNow('0813 000 2999', 'device-b', later(30)).channel).toBe('sms');
  });

  it('rejects input that is neither a phone nor an email', () => {
    expect(codeOf(() => requestResetOtpNow('0803', DEVICE, t0))).toBe('invalid_identifier');
    expect(codeOf(() => requestResetOtpNow('aisha@', DEVICE, t0))).toBe('invalid_identifier');
  });
});

describe('the reset token and new password', () => {
  function tokenFor(raw = DEMO_CUSTOMER.phone, at = t0) {
    requestResetOtpNow(raw, DEVICE, at);
    return verifyResetOtpNow(raw, '123456', at).resetToken;
  }

  it('changes the password, signs out every session and tells the owner', () => {
    createSessionNow({ userId: DEMO_CUSTOMER.id, device: { id: 'phone', userAgent: '' }, remember: true, staff: false, previousRefreshToken: null }, t0);
    const token = tokenFor();
    resetPasswordNow(token, 'New-Minna-Pass-1', later(10));
    expect(findUser(DEMO_CUSTOMER.id)?.passwordHash).toBe(mockHash('New-Minna-Pass-1'));
    expect(liveSessionsOf(DEMO_CUSTOMER.id, later(10))).toHaveLength(0);
    expect(loginWithPasswordNow('aisha@example.com', 'New-Minna-Pass-1', later(20)).id).toBe(DEMO_CUSTOMER.id);
    expect(devOutbox().filter((m) => m.kind === 'security_notice').length).toBeGreaterThan(0);
  });

  it('works once', () => {
    const token = tokenFor();
    resetPasswordNow(token, 'New-Minna-Pass-1', later(10));
    expect(codeOf(() => resetPasswordNow(token, 'Another-Pass-2', later(20)))).toBe('reset_expired');
  });

  it('expires after 10 minutes', () => {
    const token = tokenFor();
    expect(codeOf(() => resetPasswordNow(token, 'New-Minna-Pass-1', later(PASSWORD_RESET.token.expiresMinutes * 60 + 1)))).toBe('reset_expired');
  });

  it('rejects a short password or the current one, and keeps the token for another try', () => {
    const token = tokenFor();
    expect(codeOf(() => resetPasswordNow(token, 'short', later(5)))).toBe('weak_password');
    expect(codeOf(() => resetPasswordNow(token, TEST_DEMO_PASSWORD, later(6)))).toBe('same_password');
    expect(codeOf(() => resetPasswordNow(token, 'New-Minna-Pass-1', later(7)))).toBe('none');
  });
});

describe('message templates', () => {
  it('keeps every SMS within one 160-character segment once filled in', () => {
    for (const lang of Object.keys(AUTH_MESSAGE_TEMPLATES) as (keyof typeof AUTH_MESSAGE_TEMPLATES)[]) {
      expect(renderAuthMessage(lang, 'reset_code', { code: '123456', minutes: 5 }).sms.length).toBeLessThanOrEqual(160);
      expect(renderAuthMessage(lang, 'password_changed', { support: 'support@gwani.ng' }).sms.length).toBeLessThanOrEqual(160);
    }
  });
});
