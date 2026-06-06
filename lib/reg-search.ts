import Anthropic from "@anthropic-ai/sdk";
import type { LiveRegResult } from "@/lib/types";

/**
 * Live full-text regulatory search over official federal sources.
 *
 * Replaces the curated "Regulations" column with specific results pulled at
 * request time:
 *   - eCFR  (https://www.ecfr.gov/api/search/v1) — current, in-force CFR
 *     sections, returned at section granularity with citation + excerpt.
 *   - Federal Register (https://www.federalregister.gov/api/v1) — open
 *     rulemakings (proposed rules) whose public comment period is still open,
 *     with the real comment-close date.
 *
 * The search terms are specific activity/process/material/emission phrases that
 * a fast model extracts from the company description, so results are far more
 * targeted than the generic curated entries. Neither source needs an API key.
 *
 * No fabrication: every field (citation, date, link) comes straight from the
 * source response. On any failure the search degrades to fewer/zero results
 * rather than inventing anything.
 */

const KEYWORD_MODEL = "claude-haiku-4-5";

/** How many focused search phrases we extract and run against each source. */
const MAX_QUERIES = 4;
/** Per-query result cap from each source (before dedup). */
const PER_QUERY = 3;
/** Final caps so the column stays readable. */
const MAX_IN_FORCE = 6;
const MAX_PROPOSED = 4;

/** A fetch with a hard timeout so a slow source can't hang the request. */
async function getJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Strip HTML highlight markup (<strong>…</strong>) and collapse whitespace. */
function clean(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// Every US state except California. Used to recognize and drop other states'
// State Implementation Plan (SIP) / air-plan actions — the Federal Register is
// full of these and they're noise for a California-focused company.
const OTHER_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana",
  "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee",
  "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

/**
 * True for Federal Register items that are another state's SIP / air-plan
 * action (e.g. "Air Plan Approval; New York; ..."). These are state-plan
 * paperwork, not something a California venture acts on, so we drop them.
 * California's own air-plan actions are kept.
 */
function isOtherStateSip(title: string): boolean {
  const t = title.toLowerCase();
  const sipLike =
    /implementation plan|air plan|\bstate plan\b|\bsip\b|infrastructure sip/.test(
      t,
    );
  if (!sipLike) return false;
  if (/california/.test(t)) return false;
  return OTHER_STATES.some((s) => t.includes(s.toLowerCase()));
}

/**
 * Ask a fast model for specific, searchable regulatory phrases describing what
 * the company physically does (processes, materials, emissions, waste streams).
 * Generic business terms ("startup", "SaaS") are useless for full-text reg
 * search, so we steer toward the concrete. Falls back to a naive keyword
 * extraction if there's no API key or the call fails.
 */
export async function extractRegKeywords(description: string): Promise<string[]> {
  const fallback = () =>
    Array.from(
      new Set(
        description
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 4),
      ),
    ).slice(0, 3);

  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: KEYWORD_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You build full-text search queries for federal regulations (eCFR and the Federal Register).

From the company description below, output ${MAX_QUERIES} short search phrases (2-4 words each) describing the SPECIFIC regulated activity: physical processes, materials handled, emissions, discharges, or waste streams. Prefer the concrete and technical (e.g. "chromium electroplating", "hexavalent chromium emissions", "battery manufacturing wastewater"). Avoid generic business words (startup, software, platform, scale).

Reply with ONLY the phrases, one per line, no numbering, no extra text.

Company description:
${description}`,
        },
      ],
    });
    const text =
      msg.content.find((b): b is Anthropic.TextBlock => b.type === "text")
        ?.text ?? "";
    const phrases = text
      .split("\n")
      .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
      .filter((l) => l.length >= 3 && l.length <= 60)
      .slice(0, MAX_QUERIES);
    return phrases.length > 0 ? phrases : fallback();
  } catch {
    return fallback();
  }
}

// ─────────────────────────────── eCFR ───────────────────────────────

interface EcfrResult {
  type?: string;
  hierarchy?: { title?: string; part?: string; section?: string };
  hierarchy_headings?: { section?: string };
  headings?: { part?: string; subpart?: string; section?: string };
  full_text_excerpt?: string;
  score?: number;
}

/** Current, in-force CFR sections matching a query phrase. */
async function searchEcfr(query: string): Promise<LiveRegResult[]> {
  const url = `https://www.ecfr.gov/api/search/v1/results?query=${encodeURIComponent(
    query,
  )}&per_page=${PER_QUERY}`;
  const data = (await getJson(url).catch(() => null)) as {
    results?: EcfrResult[];
  } | null;
  const results = data?.results ?? [];

  const out: LiveRegResult[] = [];
  for (const r of results) {
    const title = r.hierarchy?.title;
    const section = r.hierarchy?.section;
    if (!title || !section) continue; // need a real citation
    const citation = `${title} CFR § ${section}`;
    // Prefer the most specific heading available for a human-readable title.
    const heading =
      clean(r.headings?.section) ||
      clean(r.headings?.subpart) ||
      clean(r.headings?.part) ||
      citation;
    out.push({
      id: `ecfr:${title}-${section}`,
      source: "ecfr",
      kind: "in_force",
      title: heading,
      citation,
      agency: clean(r.headings?.part) || null,
      excerpt: clean(r.full_text_excerpt),
      url: `https://www.ecfr.gov/current/title-${title}/section-${section}`,
      commentsCloseOn: null,
      publicationDate: null,
    });
  }
  return out;
}

// ─────────────────────────── Federal Register ───────────────────────────

interface FrAgency {
  name?: string;
  raw_name?: string;
}
interface FrDoc {
  title?: string;
  document_number?: string;
  html_url?: string;
  publication_date?: string;
  comments_close_on?: string | null;
  abstract?: string | null;
  agencies?: FrAgency[];
}

/** Open proposed rules (comment period still open) matching a query phrase. */
async function searchFederalRegister(query: string): Promise<LiveRegResult[]> {
  const params = new URLSearchParams();
  params.set("per_page", String(PER_QUERY));
  params.set("order", "newest");
  params.set("conditions[term]", query);
  params.append("conditions[type][]", "PRORULE");
  // The filterable condition is `comment_date`, though the returned field is
  // `comments_close_on`. Keep only rules whose window is still open.
  params.set("conditions[comment_date][gte]", todayIso());
  for (const f of [
    "title",
    "document_number",
    "html_url",
    "publication_date",
    "comments_close_on",
    "abstract",
    "agencies",
  ]) {
    params.append("fields[]", f);
  }

  const data = (await getJson(
    `https://www.federalregister.gov/api/v1/documents.json?${params}`,
  ).catch(() => null)) as { results?: FrDoc[] } | null;
  const results = data?.results ?? [];

  const out: LiveRegResult[] = [];
  for (const d of results) {
    if (!d.document_number || !d.html_url || !d.title) continue;
    const agency =
      d.agencies?.find((a) => a.name)?.name ?? d.agencies?.[0]?.raw_name ?? null;
    out.push({
      id: `fr:${d.document_number}`,
      source: "federal_register",
      kind: "proposed",
      title: clean(d.title),
      citation: `FR Doc. ${d.document_number}`,
      agency,
      excerpt: clean(d.abstract).slice(0, 320),
      url: d.html_url,
      commentsCloseOn: d.comments_close_on ?? null,
      publicationDate: d.publication_date ?? null,
    });
  }
  return out;
}

/**
 * Orchestrate the full live search: extract focused phrases, fan out to both
 * sources in parallel, dedup, and cap. Open proposed rules come FIRST (a live
 * comment period is the most actionable, time-sensitive item), sorted by
 * soonest comment deadline; in-force sections follow in source-relevance order.
 * Returns [] on total failure — never throws, so an analysis still renders its
 * grant/partner columns.
 */
export async function searchRegulations(
  description: string,
): Promise<LiveRegResult[]> {
  try {
    const queries = await extractRegKeywords(description);
    if (queries.length === 0) return [];

    const settled = await Promise.allSettled([
      ...queries.map((q) => searchEcfr(q)),
      ...queries.map((q) => searchFederalRegister(q)),
    ]);

    const seen = new Set<string>();
    const inForce: LiveRegResult[] = [];
    const proposed: LiveRegResult[] = [];
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      for (const r of s.value) {
        if (seen.has(r.id)) continue;
        // Drop other states' SIP / air-plan paperwork — pure noise for a
        // California-focused venture.
        if (r.source === "federal_register" && isOtherStateSip(r.title)) {
          continue;
        }
        seen.add(r.id);
        (r.kind === "proposed" ? proposed : inForce).push(r);
      }
    }

    proposed.sort((a, b) =>
      (a.commentsCloseOn ?? "9999").localeCompare(b.commentsCloseOn ?? "9999"),
    );

    return [
      ...proposed.slice(0, MAX_PROPOSED),
      ...inForce.slice(0, MAX_IN_FORCE),
    ];
  } catch {
    return [];
  }
}
