import { createContext } from 'react';
import type { Role } from '../constants';
import type { AuthStatus } from '../session';
import type { User } from '../types';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isSignedIn: boolean;
  hasRole: (role: Role) => boolean;
  /** Where a role's home is (default: the active role's). */
  homeFor: (role?: Role) => string;
  /** Switches the active role; resolves with that role's home to navigate to. */
  switchRole: (role: Role) => Promise<string>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
