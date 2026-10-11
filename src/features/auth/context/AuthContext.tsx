import { Fragment, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { ROLE_META, type Role } from '../constants';
import { getAuthSnapshot, subscribeAuth } from '../session';
import { logout } from '../services/authService';
import { restoreSession } from '../services/sessionService';
import { switchRole as switchRoleRequest } from '../services/accountService';
import { AuthContext, type AuthContextValue } from './authContextValue';

/**
 * THE source of the signed-in user for every screen: shells, route guards, the admin role check and
 * every page that shows or uses the current person. On start it restores the session (restoreSession,
 * from the refresh cookie); until then `status` is 'loading' and guards wait instead of redirecting.
 * Every sign-out rebuilds everything below it (the `epoch` key), so no private state survives it.
 */
export function AuthProvider({ children }: {children: ReactNode;}) {
  const snapshot = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

  useEffect(() => {
    void restoreSession();
  }, []);

  const value = useMemo((): AuthContextValue => {
    const user = snapshot.user;
    return {
      status: snapshot.status,
      user,
      sessionId: snapshot.sessionId,
      ended: snapshot.ended,
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

  return (
    <AuthContext.Provider value={value}>
      <Fragment key={snapshot.epoch}>{children}</Fragment>
    </AuthContext.Provider>);

}
