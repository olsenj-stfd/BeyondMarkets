import type { EventType, OpportunityRow } from "@/lib/types";
import type { SourceRow } from "./registry";
import { parseFeed } from "./rss-parse";
import { classify } from "./tag";

/**
 * Generic RSS/Atom reader for registry sources (agency newsrooms, state
 * regulators, intermediary trackers). Items are classified by our domain
 * keywords (off-topic items dropped), typed by a small heading heuristic
 * (enforcement vs. rule/guidance vs. announcement), and stored as undated
 * "signal" events — they inform scoring context, not the deadlines dashboard.
 */

const FETCH_TIMEOUT_MS = 15_000;

const ENFORCEMENT_RE =
  /enforcement|consent order|settle|settlement|sues?\b|lawsuit|complaint against|judgment|civil penalty|fine[sd]?\b|cease and desist|injunction/i;
const RULE_RE =
  /final rule|proposed rule|rulemaking|interim rule|guidance|dear colleague|circular|advisory|policy statement|bulletin/i;

function eventTypeFor(source: SourceRow, title: string): EventType {
  if (ENFORCEMENT_RE.test(title)) return "enforcement_action";
  if (RULE_RE.test(title)) return "guidance_document";
  return source.tier >= 3 ? "intermediary_signal" : "agency_announcement";
}

export async function fetchRssSource(source: SourceRow): Promise<OpportunityRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let xml: string;
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "RegScoutBot/1.0 (regulatory research tool)" },
    });
    if (!res.ok) throw new Error(`${source.url} → ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const rows: OpportunityRow[] = [];
  for (const item of parseFeed(xml)) {
    const { domain, tags } = classify(`${item.title} ${item.summary ?? ""}`);
    // Keep on-topic only; a source's own sectors count as topical context.
    if (!domain && source.sectors.length === 0) continue;
    rows.push({
      source: source.name,
      source_id: item.link,
      type: "signal",
      event_type: eventTypeFor(source, item.title),
      title: item.title,
      agency: null,
      jurisdiction: source.jurisdiction,
      domain: domain ?? source.sectors[0] ?? null,
      tags: [...new Set([...tags, ...source.sectors])],
      summary: item.summary,
      url: item.link,
      open_date: item.published,
      deadline: null,
      effective_date: null,
      expiration_date: null,
      status: null,
      raw: item,
    });
  }
  return rows;
}
