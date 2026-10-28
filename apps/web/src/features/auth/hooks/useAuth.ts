import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/authContextValue';

/** The signed-in user and what they can do. Use this, never a mock user, to know who's using the app. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
