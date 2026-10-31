import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../../services/apiClient'
import { ROLE } from '../constants'
import { adoptSession, clearSession, getAuthSnapshot } from '../session'
import type { User, VendorBusinessInput } from '../types'
import { completeVendorSetup } from './accountService'

vi.mock('../../../services/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../services/apiClient')>(),
  apiRequest: vi.fn(),
}))

const provider: User = {
  id: 'live-provider-setup-test', roles: [ROLE.Provider], activeRole: ROLE.Provider,
  phone: '+2348012345678', phoneVerified: true, email: 'provider@example.test', emailVerified: true,
  name: 'Provider Test', language: 'en', createdAt: '2026-01-01T00:00:00.000Z', hasPassword: true,
  adminRole: null, adminSuspendedAt: null, adminAddedBy: null, lastLoginAt: null,
  vendorId: null, providerSignup: { lga: 'Agwara', town: 'Tunga', termsAcceptedAt: '2026-01-01T00:00:00.000Z' },
  rider: null, address: null, area: null,
}

beforeEach(() => {
  clearSession(null)
  vi.mocked(apiRequest).mockReset()
})

afterEach(() => clearSession(null))

describe('completeVendorSetup API service', () => {
  it('posts setup to the API and updates the session user from its response', async () => {
    adoptSession(provider, { accessToken: 'test-access', accessExpiresAt: '2026-01-01T01:00:00.000Z', sessionId: 'test-session' })
    const saved = { ...provider, vendorId: 'database-vendor-id', providerSignup: null }
    vi.mocked(apiRequest).mockResolvedValue(saved)
    const input: VendorBusinessInput = { kind: 'service', businessName: 'Provider Workshop', tradeCategory: 'carpenter' }

    await expect(completeVendorSetup(input)).resolves.toEqual(saved)

    expect(apiRequest).toHaveBeenCalledWith('/v1/vendors/setup', { method: 'POST', body: JSON.stringify(input) })
    expect(getAuthSnapshot().user?.vendorId).toBe('database-vendor-id')
  })
})
