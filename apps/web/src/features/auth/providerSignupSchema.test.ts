import { describe, expect, it } from 'vitest';
import { providerSignupSchema } from './schemas';

const provider = {
  name: 'Musa Ibrahim',
  phone: '0813 222 3333',
  email: 'musa@example.test',
  lga: 'Bosso',
  town: 'Maitumbi',
  kind: 'service',
  businessName: 'Musa Workshop',
  tradeCategory: 'carpenter',
  password: 'Strong-Pass-1',
  acceptedTerms: true,
};

describe('provider signup profile validation', () => {
  it('accepts service and retail categories that match the selected kind', () => {
    expect(providerSignupSchema.safeParse(provider).success).toBe(true);
    expect(providerSignupSchema.safeParse({ ...provider, kind: 'retail', businessName: 'Musa Foods', tradeCategory: 'grocer' }).success).toBe(true);
  });

  it('requires a 2–80 character business name and rejects email-like business names and towns', () => {
    expect(providerSignupSchema.safeParse({ ...provider, businessName: 'x' }).success).toBe(false);
    expect(providerSignupSchema.safeParse({ ...provider, businessName: 'musa@example.test' }).success).toBe(false);
    expect(providerSignupSchema.safeParse({ ...provider, town: 'musa@example.test' }).success).toBe(false);
  });

  it('rejects a trade category that does not match the selected kind', () => {
    expect(providerSignupSchema.safeParse({ ...provider, kind: 'retail' }).success).toBe(false);
    expect(providerSignupSchema.safeParse({ ...provider, kind: 'retail', tradeCategory: 'other' }).success).toBe(false);
  });
});
