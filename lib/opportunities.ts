import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Opportunity, RankedOpportunity } from "@/lib/types";

/** A cached ranking entry stored on the project row. */
export interface RankCacheEntry {
  id: string;
  relevance: number;
  whyRelevant: string;
}

interface OpportunityRowDb {
  id: string;
  source: Opportunity["source"];
  source_id: string;
  type: Opportunity["type"];
  title: string;
  agency: string | null;
  jurisdiction: Opportunity["jurisdiction"];
  domain: string | null;
  tags: string[] | null;
  summary: string | null;
  url: string;
  open_date: string | null;
  deadline: string | null;
  status: string | null;
}

function toOpportunity(r: OpportunityRowDb): Opportunity {
  return {
    id: r.id,
    source: r.source,
    sourceId: r.source_id,
    type: r.type,
    title: r.title,
    agency: r.agency,
    jurisdiction: r.jurisdiction,
    domain: r.domain,
    tags: r.tags ?? [],
    summary: r.summary,
    url: r.url,
    openDate: r.open_date,
    deadline: r.deadline,
    status: r.status,
  };
}

const SELECT_COLS =
  "id, source, source_id, type, title, agency, jurisdiction, domain, tags, summary, url, open_date, deadline, status";

/** Opportunities whose deadline is today or later, nearest first. */
export async function getUpcomingOpportunities(limit = 200): Promise<Opportunity[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("opportunities")
    .select(SELECT_COLS)
    .gte("deadline", today)
    .order("deadline", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as OpportunityRowDb[]).map(toOpportunity);
}

/**
 * Resolve a project's cached ranking into full opportunities. Joins the cached
 * [{id, relevance, whyRelevant}] to live, still-upcoming opportunities so
 * expired or removed items drop out automatically. Nearest deadline first.
 */
export async function resolveRankedCache(
  cache: RankCacheEntry[],
): Promise<RankedOpportunity[]> {
  if (!isSupabaseConfigured || cache.length === 0) return [];
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("opportunities")
    .select(SELECT_COLS)
    .in(
      "id",
      cache.map((c) => c.id),
    )
    .gte("deadline", today);
  if (error || !data) return [];

  const meta = new Map(cache.map((c) => [c.id, c]));
  return (data as OpportunityRowDb[])
    .map(toOpportunity)
    .map((o) => ({
      ...o,
      relevance: meta.get(o.id)?.relevance ?? 0,
      whyRelevant: meta.get(o.id)?.whyRelevant ?? "",
    }))
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
}

/** The signed-in user's starred opportunity ids. */
export async function getFavoriteIds(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_favorites")
    .select("opportunity_id");
  if (error || !data) return [];
  return data.map((r) => r.opportunity_id as string);
}

/** Starred opportunities that are still upcoming, nearest deadline first. */
export async function getFavoriteOpportunities(): Promise<Opportunity[]> {
  const ids = await getFavoriteIds();
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("opportunities")
    .select(SELECT_COLS)
    .in("id", ids)
    .gte("deadline", today)
    .order("deadline", { ascending: true });
  if (error || !data) return [];
  return (data as OpportunityRowDb[]).map(toOpportunity);
}
