import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { ROLE_META, type Role } from '../constants';
import { getAuthSnapshot, subscribeAuth } from '../session';
import { logout, refreshSession } from '../services/authService';
import { switchRole as switchRoleRequest } from '../services/accountService';
import { AuthContext, type AuthContextValue } from './authContextValue';

/**
 * THE source of the signed-in user for every screen: shells, route guards, the admin role check and
 * every page that shows or uses the current person. On start it restores the session (refreshSession);
 * until then `status` is 'loading' and guards wait instead of redirecting.
 */
export function AuthProvider({ children }: {children: ReactNode;}) {
  const snapshot = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo((): AuthContextValue => {
    const user = snapshot.user;
    return {
      status: snapshot.status,
      user,
      isSignedIn: !!user,
      hasRole: (role: Role) => !!user?.roles.includes(role),
      homeFor: (role?: Role) => ROLE_META[role ?? user?.activeRole ?? 'customer'].home,
      switchRole: async (role: Role) => {
        await switchRoleRequest(role);
        return ROLE_META[role].home;
      },
      signOut: logout
    };
  }, [snapshot]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
