import { describe, expect, it, vi } from 'vitest';
import { ROLE } from '../constants';
import type { User } from '../types';
import { verificationNextPath } from './VerifyEmailSection';

const homeFor = vi.fn(() => '/');
const person = (roles: User['roles'], vendorId: string | null = null) => ({ roles, vendorId });

describe('email verification destination', () => {
  it('prefers a valid state.next', () => {
    expect(verificationNextPath(person([ROLE.Provider]), '/orders', homeFor)).toBe('/orders');
    expect(homeFor).not.toHaveBeenCalled();
  });

  it('sends a provider with a vendor profile to the dashboard', () => {
    expect(verificationNextPath(person([ROLE.Provider], 'vendor-1'), undefined, homeFor)).toBe('/pro');
  });

  it('sends a provider without a vendor profile to setup', () => {
    expect(verificationNextPath(person([ROLE.Provider]), undefined, homeFor)).toBe('/account/vendor-setup');
  });

  it('keeps the existing customer and admin fallback destinations', () => {
    expect(verificationNextPath(person([ROLE.Customer]), undefined, () => '/')).toBe('/');
    expect(verificationNextPath(person([ROLE.Admin]), undefined, () => '/admin')).toBe('/admin');
  });
});
