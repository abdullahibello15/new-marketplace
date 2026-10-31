import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from './types';

const { apiToken, apiRequestToken } = vi.hoisted(() => ({ apiToken: vi.fn(), apiRequestToken: vi.fn() }));
vi.mock('../../services/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/apiClient')>(),
  getApiAccessToken: apiToken,
}));
vi.mock('../../services/mockApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/mockApi')>(),
  requestAccessToken: apiRequestToken,
}));

import { setApiAccessToken } from '../../services/apiClient';
import { ApiError } from '../../services/mockApi';
import { ROLE } from './constants';
import { adoptSession, clearSession, currentVendorId, setRequestAuthenticator } from './session';

const user = (roles: User['roles'], vendorId: string | null): User => ({
  id: 'user-1', roles, activeRole: roles[0], phone: '', phoneVerified: false, email: 'person@example.test',
  emailVerified: false, name: 'Example User', language: 'en', createdAt: '2025-01-01T00:00:00.000Z',
  hasPassword: true, adminRole: null, adminSuspendedAt: null, adminAddedBy: null, lastLoginAt: null,
  vendorId, providerSignup: null, rider: null, address: null, area: null,
});

const tokens = { accessToken: 'live-token', accessExpiresAt: '2030-01-01T00:00:00.000Z', sessionId: 'session-1' };

beforeEach(() => {
  clearSession(null);
  setApiAccessToken(null);
  apiToken.mockReturnValue(null);
  apiRequestToken.mockReturnValue(undefined);
});

describe('currentVendorId live-session bridge', () => {
  it('reads the vendor ID from the live provider session', () => {
    adoptSession(user([ROLE.Provider], 'vendor-1'), tokens);
    setApiAccessToken(tokens.accessToken);
    apiToken.mockReturnValue(tokens.accessToken);
    apiRequestToken.mockReturnValue(tokens.accessToken);
    expect(currentVendorId()).toBe('vendor-1');
  });

  it('does not expose a vendor ID to a live non-provider session', () => {
    adoptSession(user([ROLE.Customer], null), tokens);
    setApiAccessToken(tokens.accessToken);
    apiToken.mockReturnValue(tokens.accessToken);
    apiRequestToken.mockReturnValue(tokens.accessToken);
    expect(() => currentVendorId()).toThrowError(expect.objectContaining({ status: 403 }));
  });

  it('keeps mock-token lookup on the mock authenticator', () => {
    const provider = user([ROLE.Provider], 'mock-vendor');
    setRequestAuthenticator((token) => {
      if (token !== 'mock-token') throw new ApiError('Sign in to continue.', 401);
      return provider;
    });
    apiToken.mockReturnValue('live-token');
    apiRequestToken.mockReturnValue('mock-token');
    expect(currentVendorId()).toBe('mock-vendor');
  });
});
