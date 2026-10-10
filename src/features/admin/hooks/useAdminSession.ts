import { useAuth } from '../../auth/hooks/useAuth';
import { roleCan, roleSees, type AdminPermission, type AdminSection } from '../config/roles';
import { toAdminUser } from '../services/adminSession';

/**
 * The signed-in staff member (from the ONE auth session, useAuth) and what their admin role lets them see
 * and do. The UI uses this to hide sections and actions; the admin services check the same rules again.
 */
export function useAdminSession() {
  const { user, signOut } = useAuth();
  const admin = user ? toAdminUser(user) : null;
  return {
    admin,
    can: (permission: AdminPermission) => !!admin && roleCan(admin.role, permission),
    sees: (section: AdminSection) => !!admin && roleSees(admin.role, section),
    signOut
  };
}
