import { describe, expect, it, vi } from 'vitest';
import { ROLE } from '../constants';
import type { User } from '../types';
import { verificationNextPath } from './VerifyEmailSection';

const homeFor = vi.fn(() => '/');
const person = (roles: User['roles'], vendorId: string | null = null) => ({ roles, vendorId });

describe('email verification destination', () => {
  it('prefers a valid state.next', () => {
    expect(verificationNextPath(person([ROLE.Customer]), '/orders', homeFor)).toBe('/orders');
    expect(homeFor).not.toHaveBeenCalled();
  });

  it('sends a provider with a vendor profile to the dashboard', () => {
    expect(verificationNextPath(person([ROLE.Provider], 'vendor-1'), undefined, homeFor)).toBe('/pro');
  });

  it('sends providers without a vendor profile to the dashboard instead of setup', () => {
    expect(verificationNextPath(person([ROLE.Provider]), undefined, homeFor)).toBe('/pro');
    expect(verificationNextPath(person([ROLE.Provider]), '/account/vendor-setup', homeFor)).toBe('/pro');
  });

  it('keeps the existing customer and admin fallback destinations', () => {
    expect(verificationNextPath(person([ROLE.Customer]), undefined, () => '/')).toBe('/');
    expect(verificationNextPath(person([ROLE.Admin]), undefined, () => '/admin')).toBe('/admin');
  });
});
