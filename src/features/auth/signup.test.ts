import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock mode on, so codes are the known test code and the demo accounts have the demo password.
vi.mock('./config', () => ({ MOCK_AUTH: true, MOCK_OTP_CODE: '123456', MOCK_DEMO_PASSWORD: 'demo-pass-0000', MOCK_NETWORK_FAILURE_SUFFIX: '9999' }));

import { AuthError } from './errors';
import { DEMO_PHONES } from './mock/demoAccounts';
import { customerSignupSchema, passwordLoginSchema, providerSignupSchema } from './schemas';
import {
  findUser,
  finishEmailVerification,
  finishPhoneVerification,
  isVendorPublic,
  loginWithPasswordNow,
  mockHash,
  resetAuthBackendForTests,
  saveUser,
  sendEmailCodeNow,
  sendPhoneCodeNow } from
'./services/authBackend';
import { completeVendorSetupNow, registerCustomerNow, registerProviderNow } from './services/signupBackend';
import { TEST_DEMO_PASSWORD } from './testMode';

const t0 = new Date(2026, 9, 11, 10, 0, 0);
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AuthError ? e.code : 'other';
  }
  return 'none';
};
const provider = (extra: Partial<Parameters<typeof registerProviderNow>[0]> = {}) => ({
  name: 'Musa Ibrahim',
  phone: '0813 222 3333',
  email: 'musa@example.com',
  lga: 'Bosso' as const,
  town: 'Maitumbi, near the market',
  password: 'Strong-Pass-1',
  acceptedTerms: true,
  ...extra
});

beforeEach(() => resetAuthBackendForTests());

describe('customer signup', () => {
  it('creates an email account with no phone, a hashed password and an unverified email', () => {
    const user = registerCustomerNow({ name: '  Hauwa   Sani ', email: 'Hauwa@Example.com', password: 'Strong-Pass-1' }, t0);
    expect(user).toMatchObject({ name: 'Hauwa Sani', email: 'hauwa@example.com', phone: '', emailVerified: false, roles: ['customer'] });
    expect(user.passwordHash).toBe(mockHash('Strong-Pass-1'));
    expect(user.passwordHash).not.toContain('Strong-Pass-1');
  });

  it('refuses an email that already has an account, whatever the case', () => {
    expect(codeOf(() => registerCustomerNow({ name: 'Someone', email: 'AISHA@example.com', password: 'Strong-Pass-1' }, t0))).toBe('email_taken');
  });

  it('refuses a short password', () => {
    expect(codeOf(() => registerCustomerNow({ name: 'Hauwa', email: 'h@example.com', password: 'short' }, t0))).toBe('weak_password');
  });
});

describe('provider signup', () => {
  it('normalises the phone, keeps the location for vendor setup and has no vendor profile yet', () => {
    const user = registerProviderNow(provider(), t0);
    expect(user).toMatchObject({ phone: '+2348132223333', phoneVerified: false, vendorId: null, roles: ['provider'], providerSignup: { lga: 'Bosso', town: 'Maitumbi, near the market' } });
  });

  it('refuses a phone or email that already has an account', () => {
    expect(codeOf(() => registerProviderNow(provider({ phone: DEMO_PHONES.serviceVendor }), t0))).toBe('phone_taken');
    expect(codeOf(() => registerProviderNow(provider({ email: 'bala@example.com' }), t0))).toBe('email_taken');
  });

  it('needs the provider terms', () => {
    expect(codeOf(() => registerProviderNow(provider({ acceptedTerms: false }), t0))).toBe('invalid_input');
  });

  it('creates one vendor profile at the signup location, hidden until the phone is verified', () => {
    const user = registerProviderNow(provider(), t0);
    const setUp = completeVendorSetupNow(user, { kind: 'service', businessName: 'Musa Welding', tradeCategory: 'other' }, later(5));
    expect(setUp.vendorId).toBeTruthy();
    expect(setUp.providerSignup).toBeNull();
    expect(isVendorPublic(setUp.vendorId as string)).toBe(false);
    expect(codeOf(() => completeVendorSetupNow(setUp, { kind: 'service', businessName: 'Second Shop', tradeCategory: 'other' }, later(6)))).toBe('not_allowed');

    sendPhoneCodeNow(setUp, setUp.phone, later(10));
    const verified = finishPhoneVerification(findUser(setUp.id) ?? setUp, '123456', later(20));
    expect(verified.phoneVerified).toBe(true);
    expect(isVendorPublic(setUp.vendorId as string)).toBe(true);
  });
});

describe('password sign-in', () => {
  it('accepts an email or a phone number in the same field', () => {
    // The vendor contact directory is shared across tests, so this account uses its own number.
    const user = registerProviderNow(provider({ phone: '0813 777 8888', email: 'musa2@example.com' }), t0);
    expect(loginWithPasswordNow('musa2@example.com', 'Strong-Pass-1', later(1)).id).toBe(user.id);
    expect(loginWithPasswordNow('0813 777 8888', 'Strong-Pass-1', later(2)).id).toBe(user.id);
    expect(loginWithPasswordNow(DEMO_PHONES.serviceVendor, TEST_DEMO_PASSWORD, later(3)).id).toBe('usr-bala');
  });

  it('gives one message for an unknown phone, a wrong password and an account without a password', () => {
    const msg = (id: string, pw: string) => {
      try {
        loginWithPasswordNow(id, pw, t0);
      } catch (e) {
        return (e as AuthError).message;
      }
      return null;
    };
    const wrong = msg(DEMO_PHONES.customer, 'not-the-password');
    expect(msg('0813 999 0000', 'whatever-123')).toBe(wrong);
    expect(msg(DEMO_PHONES.rider, 'whatever-123')).toBe(wrong);
  });
});

describe('email verification', () => {
  it('verifies with the right code only, and the code works once', () => {
    const user = registerCustomerNow({ name: 'Hauwa', email: 'hauwa@example.com', password: 'Strong-Pass-1' }, t0);
    sendEmailCodeNow(user, t0);
    expect(codeOf(() => finishEmailVerification(user, '000000', later(5)))).toBe('wrong_code');
    expect(finishEmailVerification(user, '123456', later(6)).emailVerified).toBe(true);
    expect(codeOf(() => finishEmailVerification(user, '123456', later(7)))).toBe('no_code');
  });

  it('refuses a new phone number another account already uses', () => {
    const user = registerCustomerNow({ name: 'Hauwa', email: 'hauwa@example.com', password: 'Strong-Pass-1' }, t0);
    expect(codeOf(() => sendPhoneCodeNow(user, DEMO_PHONES.customer, t0))).toBe('phone_taken');
    const { user: withPhone } = sendPhoneCodeNow(saveUser(user), '0813 444 5555', t0);
    expect(withPhone).toMatchObject({ phone: '+2348134445555', phoneVerified: false });
  });
});

describe('form schemas', () => {
  it('trims and lowercases, and explains what is wrong', () => {
    expect(customerSignupSchema.parse({ name: ' Hauwa ', email: ' Hauwa@Example.COM ', password: '12345678' })).toEqual({ name: 'Hauwa', email: 'hauwa@example.com', password: '12345678' });
    expect(customerSignupSchema.safeParse({ name: 'H', email: 'nope', password: 'short' }).success).toBe(false);
  });

  it('normalises the provider phone and needs the terms', () => {
    const ok = providerSignupSchema.parse({ ...provider(), phone: '0813 222 3333' });
    expect(ok.phone).toBe('+2348132223333');
    expect(providerSignupSchema.safeParse({ ...provider(), acceptedTerms: false }).success).toBe(false);
    expect(providerSignupSchema.safeParse({ ...provider(), lga: 'Lagos' }).success).toBe(false);
  });

  it('accepts an email or a phone as the sign-in identifier', () => {
    expect(passwordLoginSchema.safeParse({ identifier: 'aisha@example.com', password: 'x' }).success).toBe(true);
    expect(passwordLoginSchema.safeParse({ identifier: '0800 000 0002', password: 'x' }).success).toBe(true);
    expect(passwordLoginSchema.safeParse({ identifier: 'aisha', password: 'x' }).success).toBe(false);
  });
});
