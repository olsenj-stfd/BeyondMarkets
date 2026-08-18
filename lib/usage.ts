import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Beta budget guard. Every "run" (scoring one company, or one legacy
 * single-venture analysis) spends real API tokens, so runs are capped per
 * user and by a global backstop. Both limits live here — change them in one
 * place. Enforcement is server-side in the API routes; counters persist in
 * the `usage_counters` table (see schema.sql). If the table hasn't been
 * migrated yet the guard fails OPEN (app keeps working, nothing is counted),
 * so run the migration before sharing widely.
 */

/** Free runs per signed-in user. */
export const FREE_RUNS_PER_USER = 3;

/** Total runs across all users — the backstop that actually protects the budget. */
export const GLOBAL_RUN_BUDGET = 300;

export type RunCapCode = "user_cap" | "global_cap";

/** Pre-filled request-more-access email shown when a cap is hit. */
export const ACCESS_REQUEST_MAILTO = `mailto:jess.leigh.olsen@gmail.com?subject=${encodeURIComponent(
  "RegScout beta access request",
)}&body=${encodeURIComponent(
  "Hi Jessica — I hit the beta run limit on RegScout and would love more access.\n\nMy sign-in email is: \n\nThanks!",
)}`;

const GLOBAL_KEY = "global";
const userKey = (userId: string) => `user:${userId}`;

async function readCount(
  supabase: SupabaseClient,
  key: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("key", key)
    .maybeSingle();
  if (error) return null; // table missing (pre-migration) → fail open
  return data?.count ?? 0;
}

export interface RunAllowance {
  allowed: boolean;
  code: RunCapCode | null;
}

/**
 * Check both caps for a signed-in user. The global backstop wins over the
 * per-user cap so "at capacity" isn't misreported as a personal limit.
 */
export async function checkRunAllowance(
  supabase: SupabaseClient,
  userId: string,
): Promise<RunAllowance> {
  const [globalCount, userCount] = await Promise.all([
    readCount(supabase, GLOBAL_KEY),
    readCount(supabase, userKey(userId)),
  ]);
  if (globalCount === null || userCount === null) {
    console.error("usage_counters unavailable — run guard failing open");
    return { allowed: true, code: null };
  }
  if (globalCount >= GLOBAL_RUN_BUDGET) return { allowed: false, code: "global_cap" };
  if (userCount >= FREE_RUNS_PER_USER) return { allowed: false, code: "user_cap" };
  return { allowed: true, code: null };
}

/** Global backstop only — for the legacy single-venture endpoints. */
export async function checkGlobalAllowance(
  supabase: SupabaseClient,
): Promise<RunAllowance> {
  const globalCount = await readCount(supabase, GLOBAL_KEY);
  if (globalCount === null) return { allowed: true, code: null };
  if (globalCount >= GLOBAL_RUN_BUDGET) return { allowed: false, code: "global_cap" };
  return { allowed: true, code: null };
}

/** Count one run against the user and the global backstop. */
export async function recordRun(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<void> {
  // Increment errors are swallowed: pre-migration DBs shouldn't break runs.
  await Promise.all([
    supabase.rpc("increment_usage", { counter_key: GLOBAL_KEY }),
    userId
      ? supabase.rpc("increment_usage", { counter_key: userKey(userId) })
      : Promise.resolve(),
  ]);
}

/** Standard 429 payload the board recognizes. */
export function capMessage(code: RunCapCode): string {
  return code === "global_cap"
    ? "RegScout has reached its total beta capacity for now."
    : `You've used your ${FREE_RUNS_PER_USER} free beta runs.`;
}
