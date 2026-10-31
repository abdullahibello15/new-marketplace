import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, setApiAccessToken } from '../../../services/apiClient';
import { mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { clearSession, getAuthSnapshot } from '../session';
import { ROLE } from '../constants';
import type { User } from '../types';
import { resetAuthBackendForTests, saveUser, toUser } from './authBackend';
import { completeVendorSetup } from './accountService';
import { sessionRecord } from './authService';
import { adoptLiveSession, createSession, refreshSession } from './sessionService';
import type { StoredUser } from '../mock/users';

vi.mock('../../../services/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../services/apiClient')>(),
  apiRequest: vi.fn(),
}));

const tokens = { accessToken: 'live-provider-token', accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), sessionId: 'live-session' };

function user(id: string, roles: User['roles'] = [ROLE.Provider], overrides: Partial<User> = {}): User {
  return {
    id, roles, activeRole: roles[0], phone: '+2348012345678', phoneVerified: true, email: `${id}@example.test`,
    emailVerified: true, name: 'Test Provider', language: 'en', createdAt: '2026-01-01T00:00:00.000Z',
    hasPassword: true, adminRole: null, adminSuspendedAt: null, adminAddedBy: null, lastLoginAt: null,
    vendorId: null, providerSignup: { lga: 'Agwara', town: 'Tunga', termsAcceptedAt: '2026-01-01T00:00:00.000Z' },
    rider: null, address: null, area: null, ...overrides
  };
}

function storedProvider(id: string, vendorId: string, town: string): StoredUser {
  return {
    ...user(id, [ROLE.Provider], { vendorId, providerSignup: null }),
    passwordHash: null,
    vendorDraft: { id: vendorId, businessName: `Bridge ${vendorId}`, tradeCategory: 'other', lga: 'Agwara', town }
  };
}

beforeEach(() => {
  resetAuthBackendForTests();
  clearSession(null);
  setApiAccessToken(null);
  vi.mocked(apiRequest).mockReset();
});

afterEach(() => {
  clearSession(null);
  setApiAccessToken(null);
  vi.unstubAllGlobals();
});

describe('live provider setup bridge', () => {
  it('posts live provider setup to the API and adopts its session user', async () => {
    const provider = user('live-setup-provider');
    setApiAccessToken(tokens.accessToken);
    adoptLiveSession(provider, tokens);
    const saved = { ...provider, vendorId: 'database-vendor-id', providerSignup: null };
    vi.mocked(apiRequest).mockResolvedValue(saved);
    const input = { kind: 'service' as const, businessName: 'Bridge Workshop', tradeCategory: 'other' as const };

    const result = await completeVendorSetup(input);

    expect(result.roles).toContain(ROLE.Provider);
    expect(apiRequest).toHaveBeenCalledWith('/v1/vendors/setup', { method: 'POST', body: JSON.stringify(input) });
    expect(result.vendorId).toBe('database-vendor-id');
    expect(getAuthSnapshot().user).toEqual(saved);
  });

  it('rejects a live non-provider from the mocked vendor setup', async () => {
    const buyer = user('live-setup-buyer', [ROLE.Customer], { activeRole: ROLE.Customer });
    setApiAccessToken(tokens.accessToken);
    adoptLiveSession(buyer, tokens);

    await expect(completeVendorSetup({ kind: 'service', businessName: 'Buyer Workshop', tradeCategory: 'other' }))
      .rejects.toMatchObject({ status: 403, message: 'This account is not a vendor' });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('keeps mock-token setup on the existing mock session path', async () => {
    const mock = saveUser({
      ...user('mock-setup-provider', [ROLE.Provider], { vendorId: 'mock-existing-vendor', providerSignup: null }),
      passwordHash: null,
      vendorDraft: null
    } satisfies StoredUser);
    await createSession(toUser(mock), { id: 'test-device', userAgent: 'test' }, { remember: false });

    const result = await mockResponse(() => sessionRecord(), 0);

    expect(result).toMatchObject({ id: mock.id, vendorId: 'mock-existing-vendor' });
    expect(getAuthSnapshot().user?.id).toBe(mock.id);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('restores only the signed-in provider profile after refresh', async () => {
    saveUser(storedProvider('refresh-provider-one', 'bridge-vendor-one', 'Tunga'));
    saveUser(storedProvider('refresh-provider-two', 'bridge-vendor-two', 'Bida'));
    const refreshed = user('refresh-provider-one', [ROLE.Provider], { vendorId: null, providerSignup: null });
    setApiAccessToken('expired-live-token');
    vi.mocked(apiRequest).mockResolvedValue({ ...tokens, user: refreshed });

    const result = await refreshSession();

    expect(apiRequest).toHaveBeenCalledWith('/v1/auth/refresh', { method: 'POST' }, false);
    expect(result?.vendorId).toBe('bridge-vendor-one');
    expect(getAuthSnapshot().user?.vendorId).toBe('bridge-vendor-one');
    expect(getAllVendors().some((vendor) => vendor.id === 'bridge-vendor-one')).toBe(true);
    expect(getAllVendors().some((vendor) => vendor.id === 'bridge-vendor-two')).toBe(false);
  });
});
