import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

export function client() {
  let file = {};
  try {
    file = parseEnv(readFileSync(".env.local", "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const url = process.env.VITE_SUPABASE_URL || file.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || file.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or the environment.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signIn(supabase) {
  const email = process.env.INSTRUCTOR_EMAIL;
  const password = process.env.INSTRUCTOR_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set INSTRUCTOR_EMAIL and INSTRUCTOR_PASSWORD in the environment.",
    );
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Instructor sign-in failed: ${error.message}`);
}

export async function rpc(supabase, name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data;
}
