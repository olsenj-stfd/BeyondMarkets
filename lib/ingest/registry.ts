import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Data-driven source registry. The ingest runner loads due sources from the
 * `sources` table each run, so new feeds can be added per sector or state in
 * the database without a deploy. Falls back to null when the table doesn't
 * exist yet (pre-migration) so ingestion keeps working on the legacy sources.
 */

export interface SourceRow {
  id: string;
  name: string;
  url: string;
  source_type: string;
  jurisdiction: string;
  tier: number;
  crawl_cadence: "daily" | "weekly" | "monthly";
  sectors: string[];
  fetch_method: "api" | "rss" | "scrape" | "manual";
  adapter: string | null;
  config: Record<string, unknown>;
  active: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
}

const CADENCE_MS: Record<SourceRow["crawl_cadence"], number> = {
  daily: 20 * 60 * 60 * 1000, // slightly under a day so a daily cron never skips
  weekly: 6.5 * 24 * 60 * 60 * 1000,
  monthly: 29 * 24 * 60 * 60 * 1000,
};

export function isDue(source: SourceRow, now = Date.now()): boolean {
  if (!source.last_fetched_at) return true;
  const interval = CADENCE_MS[source.crawl_cadence] ?? CADENCE_MS.weekly;
  return now - new Date(source.last_fetched_at).getTime() >= interval;
}

/** How overdue a source is, for most-overdue-first ordering. */
function overdueBy(source: SourceRow, now = Date.now()): number {
  if (!source.last_fetched_at) return Number.MAX_SAFE_INTEGER;
  const interval = CADENCE_MS[source.crawl_cadence] ?? CADENCE_MS.weekly;
  return now - new Date(source.last_fetched_at).getTime() - interval;
}

/**
 * Active sources that are due for a fetch, most overdue first (never-fetched
 * first of all). Returns null when the sources table is missing so the caller
 * can fall back to the legacy hard-coded source list.
 */
export async function loadDueSources(
  admin: SupabaseClient,
): Promise<SourceRow[] | null> {
  const { data, error } = await admin
    .from("sources")
    .select(
      "id, name, url, source_type, jurisdiction, tier, crawl_cadence, sectors, fetch_method, adapter, config, active, last_fetched_at, last_status",
    )
    .eq("active", true);
  if (error) return null; // table not migrated yet → legacy behavior
  const now = Date.now();
  return ((data as SourceRow[]) ?? [])
    .filter((s) => isDue(s, now))
    .sort((a, b) => overdueBy(b, now) - overdueBy(a, now));
}

export async function markFetched(
  admin: SupabaseClient,
  sourceId: string,
  status: string,
): Promise<void> {
  await admin
    .from("sources")
    .update({ last_fetched_at: new Date().toISOString(), last_status: status })
    .eq("id", sourceId);
}
