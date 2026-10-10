import { ROLE } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { roleCan, roleSees, type AdminPermission, type AdminSection } from '../config/roles';
import type { AdminUser } from '../types';

/**
 * The signed-in staff member (from the ONE auth session, useAuth) and what their admin role lets them see
 * and do. The UI uses this to hide sections and actions; the admin services check the same rules again.
 */
export function useAdminSession() {
  const { user, signOut } = useAuth();
  const admin: AdminUser | null = user && user.roles.includes(ROLE.Admin) && user.adminRole ? { id: user.id, name: user.name, role: user.adminRole } : null;
  return {
    admin,
    can: (permission: AdminPermission) => !!admin && roleCan(admin.role, permission),
    sees: (section: AdminSection) => !!admin && roleSees(admin.role, section),
    signOut
  };
}
