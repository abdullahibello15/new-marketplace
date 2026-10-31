import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/mockApi';
import { ROLE } from '../../auth/constants';
import type { User } from '../../auth/types';

const { loginWithPassword, logout } = vi.hoisted(() => ({ loginWithPassword: vi.fn(), logout: vi.fn() }));
vi.mock('../../auth/services/authService', () => ({ loginWithPassword, logout }));

import { signInVendor, vendorLoginErrorMessage } from './vendorLoginService';

const user = (roles: User['roles']): User => ({
  id: 'user-1', roles, activeRole: roles[0], phone: '', phoneVerified: false, email: 'person@example.test',
  emailVerified: false, name: 'Example User', language: 'en', createdAt: '2025-01-01T00:00:00.000Z',
  hasPassword: true, adminRole: null, adminSuspendedAt: null, adminAddedBy: null, lastLoginAt: null,
  vendorId: roles.includes(ROLE.Provider) ? 'vendor-1' : null, providerSignup: null, rider: null, address: null, area: null,
});

beforeEach(() => vi.clearAllMocks());

describe('vendor login', () => {
  it('allows a provider to sign in through live password auth', async () => {
    loginWithPassword.mockResolvedValue(user([ROLE.Provider]));
    await expect(signInVendor('vendor@example.test', 'long-password')).resolves.toEqual({ status: 'signed_in' });
    expect(loginWithPassword).toHaveBeenCalledWith('vendor@example.test', 'long-password', { remember: false });
    expect(logout).not.toHaveBeenCalled();
  });

  it('returns the same credential result for a wrong password', async () => {
    loginWithPassword.mockRejectedValue(new ApiError('Sign in to continue.', 401));
    await expect(signInVendor('vendor@example.test', 'wrong-password')).resolves.toEqual({ status: 'invalid_credentials' });
    expect(logout).not.toHaveBeenCalled();
  });

  it('signs out and rejects a valid account without the provider role', async () => {
    loginWithPassword.mockResolvedValue(user([ROLE.Customer]));
    await expect(signInVendor('person@example.test', 'long-password')).resolves.toEqual({ status: 'not_vendor' });
    expect(logout).toHaveBeenCalledOnce();
  });

  it('returns the rate-limited result for HTTP 429', async () => {
    loginWithPassword.mockRejectedValue(new ApiError('Too many attempts.', 429));
    await expect(signInVendor('vendor@example.test', 'long-password')).resolves.toEqual({ status: 'rate_limited' });
    expect(logout).not.toHaveBeenCalled();
    expect(vendorLoginErrorMessage('rate_limited')).toBe('Too many attempts, try again later');
  });

  it('uses one generic credential message for invalid credentials', () => {
    expect(vendorLoginErrorMessage('invalid_credentials')).toBe('Invalid email or password.');
  });
});
