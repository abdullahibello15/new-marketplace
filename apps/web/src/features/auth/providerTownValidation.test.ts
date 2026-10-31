import { beforeEach, describe, expect, it } from 'vitest';
import { providerSignupSchema } from './schemas';
import { AuthError } from './errors';
import { resetAuthBackendForTests } from './services/authBackend';
import { registerProviderNow } from './services/signupBackend';

const signup = {
  name: 'Musa Ibrahim',
  phone: '0813 222 3333',
  email: 'musa@example.com',
  lga: 'Bosso' as const,
  town: 'Maitumbi, near the market',
  password: 'Strong-Pass-1',
  acceptedTerms: true
};

beforeEach(() => resetAuthBackendForTests());

describe('provider signup town validation', () => {
  it('rejects an email address in the form town field with a clear message', () => {
    const result = providerSignupSchema.safeParse({ ...signup, town: 'musa@example.com' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Enter a town or landmark, not an email address.');
  });

  it('rejects an email address at the mock signup boundary', () => {
    expect(() => registerProviderNow({ ...signup, town: 'musa@example.com' }, new Date('2026-01-01T00:00:00.000Z')))
      .toThrowError(expect.objectContaining({ message: 'Enter a town or landmark, not an email address.' } satisfies Partial<AuthError>));
  });

  it('continues to accept a place name', () => {
    expect(providerSignupSchema.parse(signup).town).toBe('Maitumbi, near the market');
    expect(registerProviderNow(signup, new Date('2026-01-01T00:00:00.000Z')).providerSignup?.town).toBe('Maitumbi, near the market');
  });
});
