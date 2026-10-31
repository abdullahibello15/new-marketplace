import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../../../services/apiClient'
import { clearSession, adoptSession } from '../../auth/session'
import { ROLE } from '../../auth/constants'
import type { User } from '../../auth/types'
import type { ProfileFormData } from '../types'
import { saveVendorProfile } from './vendorProfileService'

vi.mock('../../../services/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../services/apiClient')>(),
  apiRequest: vi.fn(),
}))
vi.mock('../utils/profileForm', () => ({
  toProfilePatch: vi.fn(() => ({ bio: 'Updated workshop profile' })),
  isNewService: vi.fn((id: string) => id.startsWith('new-')),
}))

const provider: User = {
  id: 'live-provider-profile-test', roles: [ROLE.Provider], activeRole: ROLE.Provider,
  phone: '+2348012345678', phoneVerified: true, email: 'provider@example.test', emailVerified: true,
  name: 'Provider Test', language: 'en', createdAt: '2026-01-01T00:00:00.000Z', hasPassword: true,
  adminRole: null, adminSuspendedAt: null, adminAddedBy: null, lastLoginAt: null,
  vendorId: 'owned-vendor-id', providerSignup: null, rider: null, address: null, area: null,
}

beforeEach(() => {
  clearSession(null)
  adoptSession(provider, { accessToken: 'test-access', accessExpiresAt: '2026-01-01T01:00:00.000Z', sessionId: 'test-session' })
  vi.mocked(apiRequest).mockReset()
})

afterEach(() => clearSession(null))

describe('vendorProfileService API switch', () => {
  it('patches the authenticated vendor profile through the API', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ bio: 'Updated workshop profile' })
    const data = { gallery: [], services: [] } as unknown as ProfileFormData

    await expect(saveVendorProfile('owned-vendor-id', data)).resolves.toEqual({ bio: 'Updated workshop profile' })

    expect(apiRequest).toHaveBeenCalledWith('/v1/vendors/me', {
      method: 'PATCH', body: JSON.stringify({ bio: 'Updated workshop profile' }),
    })
  })

  it('rejects a vendor ID that does not match the signed-in provider', async () => {
    await expect(saveVendorProfile('another-vendor-id', {} as ProfileFormData)).rejects.toMatchObject({ status: 403 })
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
