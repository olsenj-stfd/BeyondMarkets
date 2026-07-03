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
      event_type: "nprm_open_comment",
      title: d.title,
      agency,
      jurisdiction: "federal",
      domain,
      tags,
      summary: d.abstract,
      url: d.html_url,
      open_date: toIsoDate(d.publication_date),
      deadline: toIsoDate(d.comments_close_on),
      effective_date: null,
      expiration_date: null,
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
          event_type: "nprm_open_comment",
          title: a.title,
          agency: a.agencyId,
          jurisdiction: "federal",
          domain,
          tags,
          summary: null,
          url: `https://www.regulations.gov/document/${d.id}`,
          open_date: toIsoDate(a.postedDate),
          deadline,
          effective_date: null,
          expiration_date: null,
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
  // Healthcare, workforce, and economic-development angles.
  "public health",
  "behavioral health",
  "health workforce",
  "workforce development",
  "apprenticeship",
  "job training",
  "economic development",
  "small business",
  "entrepreneurship",
  "rural business",
  "community development",
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
        event_type: "grant_open",
        title: h.title,
        agency: h.agency ?? null,
        jurisdiction: "federal",
        domain,
        tags,
        summary: null,
        url: `https://www.grants.gov/search-results-detail/${h.id}`,
        open_date: fromUsDate(h.openDate),
        deadline,
        effective_date: null,
        expiration_date: null,
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

// ──────────────────── Federal Register: final rules ────────────────────
// Final rules pending a future effective date are often the highest-signal
// items for a portfolio company (a market reshapes on the effective date, not
// the comment deadline), plus rules that took effect in the last 12 months.

interface FrFinalDoc extends FrDoc {
  effective_on: string | null;
}

async function fetchFrRules(params: URLSearchParams): Promise<FrFinalDoc[]> {
  params.set("per_page", "200");
  params.set("order", "newest");
  params.append("conditions[type][]", "RULE");
  for (const f of [
    "title",
    "document_number",
    "html_url",
    "publication_date",
    "effective_on",
    "comments_close_on",
    "abstract",
    "agencies",
  ]) {
    params.append("fields[]", f);
  }
  const data = await getJson(
    `https://www.federalregister.gov/api/v1/documents.json?${params}`,
  );
  return data?.results ?? [];
}

export async function fetchFederalRegisterFinal(): Promise<OpportunityRow[]> {
  const today = todayIso();
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Pending: effective date still in the future.
  const pendingParams = new URLSearchParams();
  pendingParams.set("conditions[effective_date][gte]", today);
  // Recent: published in the last 12 months (effective date may have passed).
  const recentParams = new URLSearchParams();
  recentParams.set("conditions[publication_date][gte]", yearAgo);
  recentParams.set("conditions[effective_date][lte]", today);

  const [pending, recent] = await Promise.all([
    fetchFrRules(pendingParams).catch(() => [] as FrFinalDoc[]),
    fetchFrRules(recentParams).catch(() => [] as FrFinalDoc[]),
  ]);

  const rows: OpportunityRow[] = [];
  const seen = new Set<string>();
  for (const [docs, eventType] of [
    [pending, "rule_final_pending_effective"],
    [recent, "rule_effective_recent"],
  ] as const) {
    for (const d of docs) {
      if (seen.has(d.document_number)) continue;
      const text = `${d.title} ${d.abstract ?? ""}`;
      const { domain, tags } = classify(text);
      if (!domain) continue; // off-topic final rule — skip
      seen.add(d.document_number);
      const agency =
        d.agencies?.find((a) => a.name)?.name ?? d.agencies?.[0]?.raw_name ?? null;
      rows.push({
        source: "federal_register_final",
        source_id: d.document_number,
        type: "signal",
        event_type: eventType,
        title: d.title,
        agency,
        jurisdiction: "federal",
        domain,
        tags,
        summary: d.abstract,
        url: d.html_url,
        open_date: toIsoDate(d.publication_date),
        deadline: null,
        effective_date: toIsoDate(d.effective_on),
        expiration_date: null,
        status: eventType === "rule_final_pending_effective" ? "pending_effective" : "effective",
        raw: d,
      });
    }
  }
  return rows;
}

// ──────────────────── Grants.gov: forecasted NOFOs ────────────────────
// Forecasted opportunities have no close date yet — the value is the early
// warning, so they're stored dateless and surfaced by the scorer, not the
// deadlines dashboard.

export async function fetchGrantsGovForecasted(): Promise<OpportunityRow[]> {
  const byId = new Map<string, OpportunityRow>();
  for (const keyword of GRANTS_GOV_KEYWORDS) {
    let hits: GgHit[] = [];
    try {
      const data = await getJson("https://api.grants.gov/v1/api/search2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, oppStatuses: "forecasted", rows: 50 }),
      });
      hits = data?.data?.oppHits ?? [];
    } catch {
      continue;
    }
    for (const h of hits) {
      if (byId.has(h.id)) continue;
      const text = `${h.title} ${(h.cfdaList ?? []).join(" ")}`;
      const { domain, tags } = classify(text);
      if (!domain) continue;
      byId.set(h.id, {
        source: "grants_gov_forecasted",
        source_id: h.id,
        type: "signal",
        event_type: "grant_forecasted",
        title: h.title,
        agency: h.agency ?? null,
        jurisdiction: "federal",
        domain,
        tags,
        summary: null,
        url: `https://www.grants.gov/search-results-detail/${h.id}`,
        open_date: fromUsDate(h.openDate),
        deadline: fromUsDate(h.closeDate),
        effective_date: null,
        expiration_date: null,
        status: "forecasted",
        raw: h,
      });
    }
  }
  return [...byId.values()];
}

// ──────────────────────── Congress.gov: moving bills ────────────────────────
// Recently-acted bills (introduced through enacted). Needs a free key from
// https://api.congress.gov/sign-up — the adapter returns [] without one so the
// registry row can stay active.

interface CgBill {
  congress: number;
  number: string;
  type: string; // "HR" | "S" | "HJRES" | ...
  title: string;
  updateDate: string;
  latestAction?: { actionDate?: string; text?: string };
}

const BILL_URL_TYPE: Record<string, string> = {
  hr: "house-bill",
  s: "senate-bill",
  hjres: "house-joint-resolution",
  sjres: "senate-joint-resolution",
  hconres: "house-concurrent-resolution",
  sconres: "senate-concurrent-resolution",
  hres: "house-resolution",
  sres: "senate-resolution",
};

function billEventType(actionText: string): OpportunityRow["event_type"] {
  const t = actionText.toLowerCase();
  if (/became public law|signed by president/.test(t)) {
    return "law_enacted_implementing";
  }
  if (/passed (the )?(house|senate)|agreed to (in|by) (the )?(house|senate)/.test(t)) {
    return "bill_chamber_passed";
  }
  if (/ordered to be reported|reported (to|by)|committee/.test(t)) {
    return "bill_committee_passed";
  }
  return "bill_introduced";
}

export async function fetchCongressGov(): Promise<OpportunityRow[]> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) return []; // flagged in the registry notes; no-op until keyed

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19) + "Z";
  const params = new URLSearchParams({
    fromDateTime: since,
    sort: "updateDate desc",
    limit: "250",
    format: "json",
    api_key: apiKey,
  });
  const data = await getJson(`https://api.congress.gov/v3/bill?${params}`);
  const bills: CgBill[] = data?.bills ?? [];

  const rows: OpportunityRow[] = [];
  for (const b of bills) {
    if (!b.title || !b.number || !b.type) continue;
    const { domain, tags } = classify(b.title);
    if (!domain) continue; // keep on-topic
    const action = b.latestAction?.text ?? "";
    const urlType = BILL_URL_TYPE[b.type.toLowerCase()] ?? "house-bill";
    rows.push({
      source: "congress_gov",
      source_id: `${b.congress}-${b.type}-${b.number}`,
      type: "signal",
      event_type: billEventType(action),
      title: `${b.type} ${b.number}: ${b.title}`,
      agency: "U.S. Congress",
      jurisdiction: "federal",
      domain,
      tags,
      summary: action || null,
      url: `https://www.congress.gov/bill/${b.congress}th-congress/${urlType}/${b.number}`,
      open_date: toIsoDate(b.latestAction?.actionDate ?? b.updateDate),
      deadline: null,
      effective_date: null,
      expiration_date: null,
      status: action ? action.slice(0, 120) : null,
      raw: b,
    });
  }
  return rows;
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
      event_type: "grant_open",
      title: r.Title,
      agency: r.AgencyDept,
      jurisdiction: "california",
      domain,
      tags,
      summary: r.Purpose?.trim() || r.Description?.trim() || null,
      url: r.GrantURL || `https://www.grants.ca.gov/grants/${r.PortalID}`,
      open_date: toIsoDate(r.OpenDate),
      deadline,
      effective_date: null,
      expiration_date: null,
      status: r.Status,
      raw: r,
    });
  }
  return rows;
}
