// Keeps the current Supabase session available to the application.
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { mapError } from "../lib/errors";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) {
        setSession(next);
        setLoading(false);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (live) {
        setSession(data.session);
        setLoading(false);
      }
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) throw mapError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw mapError(error);
  }

  async function signOut() {
    if (!supabase) throw mapError(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw mapError(error);
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
