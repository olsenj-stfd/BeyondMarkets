import { createAdminClient } from "@/lib/supabase/admin";
import type { OpportunityRow } from "@/lib/types";
import {
  fetchCaGrants,
  fetchFederalRegister,
  fetchGrantsGov,
  fetchRegulationsGov,
} from "./sources";

export interface IngestReport {
  fetched: Record<string, number>;
  upserted: number;
  errors: string[];
}

/**
 * Pulls every source, upserts into `opportunities` (deduped on source+source_id),
 * and reports counts. A single source failing is recorded but doesn't abort the
 * others. Writes use the service-role admin client (server-only).
 */
export async function runIngest(): Promise<IngestReport> {
  const sources: [string, () => Promise<OpportunityRow[]>][] = [
    ["federal_register", fetchFederalRegister],
    ["regulations_gov", fetchRegulationsGov],
    ["grants_gov", fetchGrantsGov],
    ["ca_grants", fetchCaGrants],
  ];

  const report: IngestReport = { fetched: {}, upserted: 0, errors: [] };
  const allRows: OpportunityRow[] = [];

  for (const [name, fetcher] of sources) {
    try {
      const rows = await fetcher();
      report.fetched[name] = rows.length;
      allRows.push(...rows);
    } catch (err) {
      report.fetched[name] = 0;
      report.errors.push(`${name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (allRows.length === 0) return report;

  // Drop Regulations.gov rows that duplicate a Federal Register rule already in
  // this batch (matched on the FR document number), so the same rulemaking
  // doesn't appear twice on the dashboard.
  const frIds = new Set(
    allRows
      .filter((r) => r.source === "federal_register")
      .map((r) => r.source_id),
  );
  const deduped = allRows.filter((r) => {
    if (r.source !== "regulations_gov") return true;
    const frNum = (r.raw as { attributes?: { frDocNum?: string | null } })
      ?.attributes?.frDocNum;
    return !(frNum && frIds.has(frNum));
  });

  const rows = deduped.map((r) => ({ ...r, fetched_at: new Date().toISOString() }));
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("opportunities")
    .upsert(rows, { onConflict: "source,source_id", count: "exact" });

  if (error) {
    report.errors.push(`upsert: ${error.message}`);
  } else {
    report.upserted = count ?? rows.length;
  }

  return report;
}
