// Creates the shared Supabase client when configuration is available.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
// Keep the application renderable when configuration is missing or malformed.
let validUrl = false;
try {
  validUrl = !!url && ["http:", "https:"].includes(new URL(url).protocol);
} catch {
  /* configuration screen handles this */
}

export const isSupabaseConfigured = validUrl && !!key;

export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null;
