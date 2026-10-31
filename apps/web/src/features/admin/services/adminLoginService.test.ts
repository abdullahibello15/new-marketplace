import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../services/mockApi'
import { ROLE } from '../../auth/constants'
import type { User } from '../../auth/types'
import { toAdminUser } from './adminSession'

const { loginWithPassword, logout } = vi.hoisted(() => ({ loginWithPassword: vi.fn(), logout: vi.fn() }))
vi.mock('../../auth/services/authService', () => ({ loginWithPassword, logout }))

import { signInAdmin } from './adminLoginService'

const user = (roles: User['roles'], adminRole: User['adminRole'] = null): User => ({
  id: 'user-1', roles, activeRole: roles[0], phone: '', phoneVerified: false, email: 'person@example.test',
  emailVerified: false, name: 'Example User', language: 'en', createdAt: '2025-01-01T00:00:00.000Z',
  hasPassword: true, adminRole, adminSuspendedAt: null, adminAddedBy: null, lastLoginAt: null,
  vendorId: null, providerSignup: null, rider: null, address: null, area: null,
});

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin login', () => {
  it('allows an admin account to sign in', async () => {
    loginWithPassword.mockResolvedValue(user([ROLE.Admin], 'super_admin'))
    await expect(signInAdmin('admin@example.test', 'long-password')).resolves.toEqual({ status: 'signed_in' })
    expect(loginWithPassword).toHaveBeenCalledWith('admin@example.test', 'long-password', { remember: false })
    expect(logout).not.toHaveBeenCalled()
  })

  it('shows a generic credential result for a wrong password', async () => {
    loginWithPassword.mockRejectedValue(new ApiError('Sign in to continue.', 401))
    await expect(signInAdmin('admin@example.test', 'wrong-password')).resolves.toEqual({ status: 'invalid_credentials' })
    expect(logout).not.toHaveBeenCalled()
  })

  it('shows a retry-later result when the API rate limits login', async () => {
    loginWithPassword.mockRejectedValue(new ApiError('Too many attempts.', 429))
    await expect(signInAdmin('admin@example.test', 'long-password')).resolves.toEqual({ status: 'rate_limited' })
  })

  it('signs out a non-admin and denies admin-session access', async () => {
    loginWithPassword.mockResolvedValue(user([ROLE.Customer]))
    await expect(signInAdmin('person@example.test', 'long-password')).resolves.toEqual({ status: 'not_admin' })
    expect(logout).toHaveBeenCalledOnce()
    expect(toAdminUser(user([ROLE.Customer]))).toBeNull()
  })
})
