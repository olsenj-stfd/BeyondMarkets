/**
 * Reads the public Supabase env vars and normalizes the URL: trims whitespace
 * and strips trailing slashes, which otherwise produce a malformed
 * "<url>//auth/v1/..." path and a gateway "Invalid path" error.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

export const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
).trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
