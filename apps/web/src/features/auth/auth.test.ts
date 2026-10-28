import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock mode on for these tests, so the code is the known test code.
vi.mock('./config', () => ({ MOCK_AUTH: true, MOCK_OTP_CODE: '123456', MOCK_DEMO_PASSWORD: 'demo-pass-0000', MOCK_NETWORK_FAILURE_SUFFIX: '9999' }));

import { OTP, PASSWORD_LOGIN_LIMIT } from './constants';
import { AuthError } from './errors';
import { TEST_DEMO_PASSWORD } from './testMode';
import { loginWithPasswordNow, requestOtpNow, resetAuthBackendForTests, verifyOtpNow } from './services/authBackend';
import { passwordStrength } from './utils/password';

const t0 = new Date(2026, 9, 9, 10, 0, 0);
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AuthError ? e.code : 'other';
  }
  return 'none';
};

beforeEach(() => resetAuthBackendForTests());

describe('one-time codes', () => {
  it('sends a code, then signs in a known number (no duplicate account)', () => {
    const sent = requestOtpNow('0800 000 0001', t0);
    expect(sent).toMatchObject({ phone: '+2348000000001', devCode: '123456' });
    const result = verifyOtpNow('+234 800 000 0001', '123456', later(10));
    expect(result).toMatchObject({ status: 'signed_in', user: { id: 'cust-aisha' } });
    expect('passwordHash' in (result.status === 'signed_in' ? result.user : {})).toBe(false);
  });

  it('starts signup for a new number', () => {
    requestOtpNow('0813 000 1111', t0);
    const result = verifyOtpNow('08130001111', '123456', later(5));
    expect(result.status).toBe('new_user');
  });

  it('rejects invalid numbers', () => {
    expect(codeOf(() => requestOtpNow('0803', t0))).toBe('invalid_phone');
  });

  it('makes you wait before resending', () => {
    requestOtpNow('08130001111', t0);
    expect(codeOf(() => requestOtpNow('08130001111', later(OTP.resendSeconds - 1)))).toBe('resend_too_soon');
    expect(requestOtpNow('08130001111', later(OTP.resendSeconds)).phone).toBe('+2348130001111');
  });

  it('expires codes after 5 minutes', () => {
    requestOtpNow('08130001111', t0);
    expect(codeOf(() => verifyOtpNow('08130001111', '123456', later(OTP.expiresMinutes * 60 + 1)))).toBe('expired');
  });

  it('counts wrong codes and locks the number after the maximum', () => {
    requestOtpNow('08130001111', t0);
    for (let i = 1; i < OTP.maxAttempts; i++) {
      try {
        verifyOtpNow('08130001111', '000000', later(i));
      } catch (e) {
        expect((e as AuthError).code).toBe('wrong_code');
        expect((e as AuthError).attemptsLeft).toBe(OTP.maxAttempts - i);
      }
    }
    expect(codeOf(() => verifyOtpNow('08130001111', '000000', later(30)))).toBe('locked');
    expect(codeOf(() => requestOtpNow('08130001111', later(30 + OTP.lockoutMinutes * 60 - 1)))).toBe('locked');
    expect(requestOtpNow('08130001111', later(30 + OTP.lockoutMinutes * 60 + 1)).phone).toBe('+2348130001111');
  });

  it('simulates a dropped connection for the test number (mock mode)', () => {
    expect(() => requestOtpNow('0803 000 9999', t0)).toThrow(TypeError);
  });
});

describe('password sign-in', () => {
  it('signs in a customer with a verified email and password', () => {
    expect(loginWithPasswordNow('Aisha@Example.com', TEST_DEMO_PASSWORD, t0).id).toBe('cust-aisha');
  });

  it('gives the same answer for an unknown email and a wrong password', () => {
    const msg = (email: string, pw: string) => {
      try {
        loginWithPasswordNow(email, pw, t0);
      } catch (e) {
        return (e as AuthError).message;
      }
      return null;
    };
    expect(msg('nobody@example.com', 'whatever-123')).toBe(msg('aisha@example.com', 'wrong-password'));
  });

  it('rate-limits repeated failures for an email', () => {
    for (let i = 0; i < PASSWORD_LOGIN_LIMIT.maxFailures; i++) expect(codeOf(() => loginWithPasswordNow('aisha@example.com', 'nope-nope', later(i)))).toBe('invalid_credentials');
    expect(codeOf(() => loginWithPasswordNow('aisha@example.com', TEST_DEMO_PASSWORD, later(10)))).toBe('rate_limited');
  });
});

describe('password strength', () => {
  it('needs 8 characters and rewards variety and length', () => {
    expect(passwordStrength('short').score).toBe(0);
    expect(passwordStrength('password').label).toBe('weak');
    expect(passwordStrength('minna2026').score).toBe(2);
    expect(passwordStrength('Minna-Demo-2026!').score).toBe(4);
  });
});
