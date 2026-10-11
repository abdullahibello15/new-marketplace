import { createContext } from 'react';
import type { Role } from '../constants';
import type { AuthSnapshot, AuthStatus } from '../session';
import type { User } from '../types';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** This browser's session (marks "This device" on the sessions page). */
  sessionId: string | null;
  /** Why the last session in this browser ended (the login screen explains it). */
  ended: AuthSnapshot['ended'];
  isSignedIn: boolean;
  hasRole: (role: Role) => boolean;
  /** Where a role's home is (default: the active role's). */
  homeFor: (role?: Role) => string;
  /** Switches the active role; resolves with that role's home to navigate to. */
  switchRole: (role: Role) => Promise<string>;
  /** Signs out (server, this browser, every tab). Callers then go to the login screen. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
