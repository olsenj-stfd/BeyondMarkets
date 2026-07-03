import { createAdminClient } from "@/lib/supabase/admin";
import type { OpportunityRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDueSources, markFetched, type SourceRow } from "./registry";
import { fetchRssSource } from "./rss";
import {
  fetchCaGrants,
  fetchCongressGov,
  fetchFederalRegister,
  fetchFederalRegisterFinal,
  fetchGrantsGov,
  fetchGrantsGovForecasted,
  fetchRegulationsGov,
} from "./sources";

export interface IngestReport {
  fetched: Record<string, number>;
  upserted: number;
  skipped: string[];
  errors: string[];
}

/**
 * Stop starting new sources this far into the run so the function returns
 * before Vercel's 60s cap. Sources left over are picked up next run (the
 * registry orders by most-overdue-first, so coverage rotates fairly).
 */
const TIME_BUDGET_MS = 40_000;

/** Named built-in adapters for registry rows with fetch_method='api'. */
const API_ADAPTERS: Record<string, () => Promise<OpportunityRow[]>> = {
  grants_gov: fetchGrantsGov,
  grants_gov_forecasted: fetchGrantsGovForecasted,
  federal_register: fetchFederalRegister,
  federal_register_final: fetchFederalRegisterFinal,
  regulations_gov: fetchRegulationsGov,
  congress_gov: fetchCongressGov,
  ca_grants: fetchCaGrants,
};

/** Legacy fixed source list, used until the `sources` table is migrated. */
const LEGACY_SOURCES: [string, () => Promise<OpportunityRow[]>][] = [
  ["federal_register", fetchFederalRegister],
  ["regulations_gov", fetchRegulationsGov],
  ["grants_gov", fetchGrantsGov],
  ["ca_grants", fetchCaGrants],
];

/** Columns added by the taxonomy migration, stripped on retry if missing. */
const TAXONOMY_COLUMNS = ["event_type", "effective_date", "expiration_date"] as const;

/**
 * Upsert rows; if the DB predates the taxonomy migration (missing columns),
 * strip the new fields and retry once so ingestion never hard-fails on an
 * un-migrated database.
 */
async function upsertRows(
  supabase: SupabaseClient,
  rows: OpportunityRow[],
): Promise<{ count: number; error: string | null }> {
  const stamped = rows.map((r) => ({ ...r, fetched_at: new Date().toISOString() }));
  const attempt = await supabase
    .from("opportunities")
    .upsert(stamped, { onConflict: "source,source_id", count: "exact" });
  if (!attempt.error) return { count: attempt.count ?? rows.length, error: null };

  if (/column/i.test(attempt.error.message)) {
    const legacy = stamped.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      for (const col of TAXONOMY_COLUMNS) delete copy[col];
      return copy;
    });
    const retry = await supabase
      .from("opportunities")
      .upsert(legacy, { onConflict: "source,source_id", count: "exact" });
    if (!retry.error) {
      return {
        count: retry.count ?? rows.length,
        error: "taxonomy columns missing — run schema.sql to store event types",
      };
    }
    return { count: 0, error: retry.error.message };
  }
  return { count: 0, error: attempt.error.message };
}

function dispatch(source: SourceRow): Promise<OpportunityRow[]> {
  if (source.fetch_method === "rss") return fetchRssSource(source);
  if (source.fetch_method === "api") {
    const adapter = API_ADAPTERS[source.adapter ?? ""];
    if (!adapter) {
      return Promise.reject(new Error(`unknown api adapter "${source.adapter}"`));
    }
    return adapter();
  }
  // 'scrape' rows are seeded inactive; 'manual' rows are never auto-fetched.
  return Promise.reject(
    new Error(`fetch_method "${source.fetch_method}" not implemented`),
  );
}

/**
 * Registry-driven ingestion: fetch every due source (most overdue first)
 * within a time budget, upserting per source so progress persists even when
 * the budget cuts a run short. Falls back to the legacy fixed source list
 * when the `sources` table doesn't exist yet.
 */
export async function runIngest(): Promise<IngestReport> {
  const report: IngestReport = { fetched: {}, upserted: 0, skipped: [], errors: [] };
  const supabase = createAdminClient();
  const startedAt = Date.now();

  const due = await loadDueSources(supabase);

  // Track FR document numbers seen this run so Regulations.gov rows that
  // duplicate a Federal Register rule get dropped (same rulemaking, two feeds).
  const frIds = new Set<string>();

  const runOne = async (
    name: string,
    fetcher: () => Promise<OpportunityRow[]>,
    sourceId?: string,
  ) => {
    try {
      let rows = await fetcher();
      for (const r of rows) {
        if (r.source === "federal_register") frIds.add(r.source_id);
      }
      if (name === "regulations_gov") {
        rows = rows.filter((r) => {
          const frNum = (r.raw as { attributes?: { frDocNum?: string | null } })
            ?.attributes?.frDocNum;
          return !(frNum && frIds.has(frNum));
        });
      }
      report.fetched[name] = rows.length;
      if (rows.length > 0) {
        const { count, error } = await upsertRows(supabase, rows);
        report.upserted += count;
        if (error) report.errors.push(`${name}: ${error}`);
      }
      if (sourceId) await markFetched(supabase, sourceId, `ok:${rows.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.fetched[name] = 0;
      report.errors.push(`${name}: ${message}`);
      if (sourceId) await markFetched(supabase, sourceId, `error:${message.slice(0, 200)}`);
    }
  };

  if (due === null) {
    // Pre-migration fallback: fixed legacy sources, no cadence tracking.
    for (const [name, fetcher] of LEGACY_SOURCES) {
      await runOne(name, fetcher);
    }
    report.errors.push(
      "sources table missing — run schema.sql to enable the registry",
    );
    return report;
  }

  for (const source of due) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      report.skipped.push(source.name);
      continue;
    }
    await runOne(source.name, () => dispatch(source), source.id);
  }

  return report;
}
