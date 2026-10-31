import { ApiError } from '../../../services/mockApi';
import { ROLE } from '../../auth/constants';
import { loginWithPassword, logout } from '../../auth/services/authService';

export type VendorLoginResult =
  | { status: 'signed_in' }
  | { status: 'not_vendor' }
  | { status: 'invalid_credentials' }
  | { status: 'rate_limited' };

export function vendorLoginErrorMessage(status: Exclude<VendorLoginResult['status'], 'signed_in'>): string {
  if (status === 'not_vendor') return 'This account is not a vendor';
  if (status === 'rate_limited') return 'Too many attempts, try again later';
  return 'Invalid email or password.';
}

export async function signInVendor(identifier: string, password: string): Promise<VendorLoginResult> {
  let user;
  try {
    user = await loginWithPassword(identifier, password, { remember: false });
  } catch (error) {
    return error instanceof ApiError && error.status === 429
      ? { status: 'rate_limited' }
      : { status: 'invalid_credentials' };
  }

  if (!user.roles.includes(ROLE.Provider)) {
    await logout();
    return { status: 'not_vendor' };
  }

  return { status: 'signed_in' };
}
