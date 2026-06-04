import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Server-only Supabase client that uses the service-role key to bypass RLS.
 *
 * SECURITY: never import this from client/browser code. The service-role key
 * lives only in SUPABASE_SERVICE_ROLE_KEY (server env, never NEXT_PUBLIC_,
 * never committed). Its sole use in this app is the ingestion route, which
 * writes global `opportunities` rows that RLS otherwise blocks for anon.
 */
export function createAdminClient() {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!SUPABASE_URL || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
