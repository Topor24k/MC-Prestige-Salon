import { createContext, useContext } from 'react';
import type { AuthValue } from '../types';

export const AuthContext = createContext<AuthValue | null>(null);
export const MIN_PASSWORD = 8;

/** The signed-in administrator and the sign-in actions. `user` is null when signed out. */
export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
