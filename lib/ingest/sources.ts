import type { OpportunityRow } from "@/lib/types";
import { classify } from "./tag";

/** A fetch with a hard timeout so a slow source can't hang ingestion. */
async function getJson(url: string, init?: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** "MM/DD/YYYY" → "YYYY-MM-DD"; returns null for empty/unparseable input. */
function fromUsDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** "YYYY-MM-DD HH:MM:SS" (or ISO) → "YYYY-MM-DD"; null if unparseable. */
function toIsoDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────── Federal Register ───────────────────────────
// Proposed rules with an open comment period. We keep only items that
// classify into one of our domains, so the dashboard stays on-topic.

interface FrAgency {
  name?: string;
  raw_name?: string;
}
interface FrDoc {
  title: string;
  document_number: string;
  html_url: string;
  publication_date: string;
  comments_close_on: string | null;
  abstract: string | null;
  agencies?: FrAgency[];
}

export async function fetchFederalRegister(): Promise<OpportunityRow[]> {
  const params = new URLSearchParams();
  params.set("per_page", "200");
  params.set("order", "newest");
  params.append("conditions[type][]", "PRORULE");
  // Filter to rules whose comment period is still open. Note: the filterable
  // condition is `comment_date`, even though the returned field is
  // `comments_close_on`.
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

  const data = await getJson(
    `https://www.federalregister.gov/api/v1/documents.json?${params}`,
  );
  const results: FrDoc[] = data?.results ?? [];

  const rows: OpportunityRow[] = [];
  for (const d of results) {
    const text = `${d.title} ${d.abstract ?? ""}`;
    const { domain, tags } = classify(text);
    if (!domain) continue; // off-topic proposed rule — skip
    const agency =
      d.agencies?.find((a) => a.name)?.name ??
      d.agencies?.[0]?.raw_name ??
      null;
    rows.push({
      source: "federal_register",
      source_id: d.document_number,
      type: "comment_period",
      title: d.title,
      agency,
      jurisdiction: "federal",
      domain,
      tags,
      summary: d.abstract,
      url: d.html_url,
      open_date: toIsoDate(d.publication_date),
      deadline: toIsoDate(d.comments_close_on),
      status: "comment_open",
      raw: d,
    });
  }
  return rows;
}

// ───────────────────────────── Regulations.gov ─────────────────────────────
// Federal documents currently open for public comment (proposed rules +
// notices), across all agencies. Broader than the Federal Register slice
// (which is proposed rules only). We can't combine `searchTerm` with the
// comment-period filters in the v4 API (that combination returns nothing), so
// we pull everything within an open comment period and keep only items that
// classify into one of our domains. Requires a free api.data.gov key.
// run.ts drops any row that duplicates a Federal Register rule (via frDocNum).

interface RgDocAttributes {
  title: string;
  documentType: string;
  postedDate: string | null;
  commentEndDate: string | null;
  agencyId: string | null;
  frDocNum: string | null;
}
interface RgDoc {
  id: string;
  attributes: RgDocAttributes;
}

const REGULATIONS_GOV_DOC_TYPES = ["Proposed Rule", "Notice"];
// Pages of 250 per document type. The open-comment set is in the low thousands
// across all topics; a couple of pages per type captures the recent bulk that
// our domain classifier then narrows to climate/energy/air/etc.
const REGULATIONS_GOV_MAX_PAGES = 2;

export async function fetchRegulationsGov(): Promise<OpportunityRow[]> {
  const apiKey = process.env.REGULATIONS_GOV_API_KEY;
  if (!apiKey) {
    throw new Error(
      "REGULATIONS_GOV_API_KEY not set — get a free key at https://api.data.gov/signup/",
    );
  }

  const byId = new Map<string, OpportunityRow>();

  for (const docType of REGULATIONS_GOV_DOC_TYPES) {
    for (let page = 1; page <= REGULATIONS_GOV_MAX_PAGES; page++) {
      const params = new URLSearchParams();
      params.set("filter[withinCommentPeriod]", "true");
      params.set("filter[documentType]", docType);
      params.set("page[size]", "250");
      params.set("page[number]", String(page));
      params.set("sort", "-postedDate");
      params.set("api_key", apiKey);

      let docs: RgDoc[] = [];
      try {
        const data = await getJson(
          `https://api.regulations.gov/v4/documents?${params}`,
        );
        docs = data?.data ?? [];
      } catch {
        break; // a page/type failing shouldn't sink the whole source
      }
      if (docs.length === 0) break; // no more pages

      for (const d of docs) {
        if (byId.has(d.id)) continue;
        const a = d.attributes;
        const deadline = toIsoDate(a.commentEndDate);
        if (!deadline) continue; // no actionable close date → skip
        const { domain, tags } = classify(a.title);
        if (!domain) continue; // keep on-topic
        byId.set(d.id, {
          source: "regulations_gov",
          source_id: d.id,
          type: "comment_period",
          title: a.title,
          agency: a.agencyId,
          jurisdiction: "federal",
          domain,
          tags,
          summary: null,
          url: `https://www.regulations.gov/document/${d.id}`,
          open_date: toIsoDate(a.postedDate),
          deadline,
          status: "comment_open",
          raw: d,
        });
      }

      if (docs.length < 250) break; // last page
    }
  }

  return [...byId.values()];
}

// ───────────────────────────── Grants.gov ─────────────────────────────
// Posted federal grants matching environmental keywords, with a close date.

interface GgHit {
  id: string;
  number: string;
  title: string;
  agency: string;
  openDate: string;
  closeDate: string;
  oppStatus: string;
  cfdaList?: string[];
}

const GRANTS_GOV_KEYWORDS = [
  "climate",
  "clean energy",
  "air quality",
  "emissions",
  "environment",
  "decarbonization",
  "energy efficiency",
  "water",
  "wildfire",
  "transportation",
  "environmental justice",
  "resilience",
];

export async function fetchGrantsGov(): Promise<OpportunityRow[]> {
  const byId = new Map<string, OpportunityRow>();

  for (const keyword of GRANTS_GOV_KEYWORDS) {
    let hits: GgHit[] = [];
    try {
      const data = await getJson("https://api.grants.gov/v1/api/search2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, oppStatuses: "posted", rows: 50 }),
      });
      hits = data?.data?.oppHits ?? [];
    } catch {
      continue; // one keyword failing shouldn't sink the whole source
    }

    for (const h of hits) {
      if (byId.has(h.id)) continue;
      const deadline = fromUsDate(h.closeDate);
      if (!deadline) continue; // no actionable date → not a "deadline"
      const text = `${h.title} ${(h.cfdaList ?? []).join(" ")}`;
      const { domain, tags } = classify(text);
      byId.set(h.id, {
        source: "grants_gov",
        source_id: h.id,
        type: "grant_deadline",
        title: h.title,
        agency: h.agency ?? null,
        jurisdiction: "federal",
        domain,
        tags,
        summary: null,
        url: `https://www.grants.gov/search-results-detail/${h.id}`,
        open_date: fromUsDate(h.openDate),
        deadline,
        status: h.oppStatus ?? null,
        raw: h,
      });
    }
  }

  return [...byId.values()];
}

// ──────────────────────── CA Grants Portal (data.ca.gov) ────────────────────────
// Active California grants with an application deadline.

const CA_GRANTS_RESOURCE_ID = "111c8c88-21f6-453c-ae2c-b4785a0624f5";

interface CaGrant {
  PortalID: string;
  Status: string;
  AgencyDept: string | null;
  Title: string;
  Type: string;
  Categories: string | null;
  Purpose: string | null;
  Description: string | null;
  OpenDate: string | null;
  ApplicationDeadline: string | null;
  GrantURL: string | null;
}

export async function fetchCaGrants(): Promise<OpportunityRow[]> {
  const params = new URLSearchParams({
    resource_id: CA_GRANTS_RESOURCE_ID,
    limit: "500",
    filters: JSON.stringify({ Status: "active" }),
  });
  const data = await getJson(
    `https://data.ca.gov/api/3/action/datastore_search?${params}`,
  );
  const records: CaGrant[] = data?.result?.records ?? [];

  const rows: OpportunityRow[] = [];
  for (const r of records) {
    const deadline = toIsoDate(r.ApplicationDeadline);
    if (!deadline) continue;
    const text = `${r.Title} ${r.Categories ?? ""} ${r.Purpose ?? ""}`;
    const { domain, tags } = classify(text);
    if (!domain) continue; // keep the portal's broad catalog scoped to our domains
    rows.push({
      source: "ca_grants",
      source_id: r.PortalID,
      type: "grant_deadline",
      title: r.Title,
      agency: r.AgencyDept,
      jurisdiction: "california",
      domain,
      tags,
      summary: r.Purpose?.trim() || r.Description?.trim() || null,
      url: r.GrantURL || `https://www.grants.ca.gov/grants/${r.PortalID}`,
      open_date: toIsoDate(r.OpenDate),
      deadline,
      status: r.Status,
      raw: r,
    });
  }
  return rows;
}
