import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Opportunity } from "@/lib/types";

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

/** Opportunities whose deadline is today or later, nearest first. */
export async function getUpcomingOpportunities(limit = 200): Promise<Opportunity[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, source, source_id, type, title, agency, jurisdiction, domain, tags, summary, url, open_date, deadline, status",
    )
    .gte("deadline", today)
    .order("deadline", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as OpportunityRowDb[]).map(toOpportunity);
}
