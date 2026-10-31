import { ApiError } from '../../../services/mockApi';
import { ROLE } from '../../auth/constants';
import { loginWithPassword, logout } from '../../auth/services/authService';

export type AdminLoginResult =
  | { status: 'signed_in' }
  | { status: 'not_admin' }
  | { status: 'invalid_credentials' }
  | { status: 'rate_limited' };

export async function signInAdmin(email: string, password: string): Promise<AdminLoginResult> {
  let user;
  try {
    user = await loginWithPassword(email, password, { remember: false });
  } catch (error) {
    return error instanceof ApiError && error.status === 429
      ? { status: 'rate_limited' }
      : { status: 'invalid_credentials' };
  }

  if (!user.roles.includes(ROLE.Admin)) {
    await logout();
    return { status: 'not_admin' };
  }

  return { status: 'signed_in' };
}
