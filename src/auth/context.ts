// Defines the shared authentication context and hook.
import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface AuthValue {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
