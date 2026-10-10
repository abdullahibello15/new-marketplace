import i18n from '../../../i18n';
import { ApiError } from '../../../services/mockApi';
import { ROLE } from '../../auth/constants';
import { findUser } from '../../auth/services/authBackend';
import { currentUser } from '../../auth/session';
import { isAdminRole, roleCan, type AdminPermission } from '../config/roles';
import type { User } from '../../auth/types';
import type { AdminUser } from '../types';

/*
 * The admin side of the ONE auth session (features/auth): a signed-in user with the Admin role, and their
 * admin sub-role (which sections and actions they get). Admin services call requirePermission before
 * acting, mirroring what the real backend checks on every request from the session token. The role and
 * suspension are read from the stored account, so a Super admin's change applies on the next request.
 */

/** A user record as an active staff member, or null (not staff, or suspended). */
export function toAdminUser(user: Pick<User, 'id' | 'name' | 'roles' | 'adminRole' | 'adminSuspendedAt'>): AdminUser | null {
  if (!user.roles.includes(ROLE.Admin) || !isAdminRole(user.adminRole) || user.adminSuspendedAt) return null;
  return { id: user.id, name: user.name, role: user.adminRole };
}

/** The signed-in staff member, or null. */
export function currentAdmin(): AdminUser | null {
  const user = currentUser();
  if (!user) return null;
  const stored = findUser(user.id);
  return stored ? toAdminUser(stored) : null;
}

/** The "backend" check every admin service makes before acting. */
export function requirePermission(permission: AdminPermission): AdminUser {
  const admin = currentAdmin();
  if (!admin) throw new ApiError(i18n.t('auth:error.staffSignIn'), 401);
  if (!roleCan(admin.role, permission)) throw new ApiError('Your role can’t do that.', 403);
  return admin;
}

/** Any signed-in staff member (for read-only admin data). */
export function requireAdmin(): AdminUser {
  const admin = currentAdmin();
  if (!admin) throw new ApiError(i18n.t('auth:error.staffSignIn'), 401);
  return admin;
}
