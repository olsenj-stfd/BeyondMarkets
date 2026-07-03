export type RecordType = "regulation" | "grant" | "partner";

export type GovLevel = "federal" | "state" | "regional" | "local" | "private";

export interface RegRecord {
  id: string;
  type: RecordType;
  title: string;
  agency: string;
  agencyAcronym: string;
  level: GovLevel;
  jurisdiction: string;
  /** Topical domain for breadth labeling: air, water, energy, climate, cross-cutting. */
  domain: string;
  summary: string;
  /** Who this typically applies to / who is eligible / who they back. */
  applicability: string;
  /** Background context: why it exists, how it fits the broader landscape. */
  context: string;
  /** Concrete steps for engaging with the agency or organization. */
  howToEngage: string;
  /** Topical tags to aid matching. */
  tags: string[];
  link: string;
}

/** A single match returned to the client, produced by the Claude matching call. */
export interface MatchResult {
  id: string;
  relevance: number; // 0-100
  /** Tailored "how this affects you" framing. */
  whyRelevant: string;
  /** 3-5 high-level, company-specific action items. */
  checklist: string[];
  /** Recurring/structural timing to engage: deadlines, comment periods, workshops/hearings cadence. */
  keyDates: string[];
}

/** A multiple-choice question used to refine the next matching pass. */
export interface FollowUp {
  question: string;
  options: string[];
}

export interface MatchResponse {
  matches: MatchResult[];
  /** 2-3 multiple-choice questions that would sharpen the next pass. */
  followUps: FollowUp[];
}

/** A match joined with its full record, for rendering. */
export interface EnrichedMatch extends MatchResult {
  record: RegRecord;
}

/**
 * A specific regulation found via live full-text search of official federal
 * sources (eCFR for in-force CFR sections, the Federal Register for open
 * rulemakings). Replaces the curated "Regulations" column: every field comes
 * from a real source with a citation and link — nothing is fabricated.
 */
export interface LiveRegResult {
  /** Stable dedup/render key, derived from source + citation. */
  id: string;
  source: "ecfr" | "federal_register";
  /** "in_force": a current CFR section. "proposed": an open rulemaking. */
  kind: "in_force" | "proposed";
  /** Human-readable heading, e.g. "Applicability; description of the lithium subcategory." */
  title: string;
  /** Citation, e.g. "40 CFR § 461.50" or the FR document number. */
  citation: string;
  agency: string | null;
  /** Short snippet of the matched text, plain (no markup). */
  excerpt: string;
  url: string;
  /** Proposed rules only: real comment-close date (ISO) from the FR API. */
  commentsCloseOn: string | null;
  /** Proposed rules only: publication date (ISO). */
  publicationDate: string | null;
}

/**
 * Where an item came from. Registry-driven sources (RSS feeds, newsrooms,
 * state regulators) use their registry name, so this is an open string with
 * the four legacy API sources as well-known values.
 */
export type OpportunitySource = string;

/**
 * Legacy coarse kind (drives the deadlines dashboard). "signal" covers
 * registry items that aren't a dated application/comment window (newsroom
 * announcements, enforcement actions, intermediary analysis).
 */
export type OpportunityType = "comment_period" | "grant_deadline" | "signal";

/**
 * Typed regulatory-event taxonomy. Each type implies its own relevance
 * window — e.g. a final rule with a future effective date matters even though
 * nothing is "open", and an expiring temporary rule forces rulemaking.
 */
export type EventType =
  | "grant_open"
  | "grant_forecasted"
  | "grant_recurring"
  | "foundation_grant"
  | "nprm_open_comment"
  | "rule_final_pending_effective"
  | "rule_effective_recent"
  | "rule_temporary_expiring"
  | "unified_agenda_planned"
  | "negotiated_rulemaking"
  | "guidance_document"
  | "bill_introduced"
  | "bill_committee_passed"
  | "bill_chamber_passed"
  | "law_enacted_implementing"
  | "enforcement_action"
  | "state_implementation_window"
  | "appropriations_event"
  | "agency_announcement"
  | "intermediary_signal";

/** A real-source regulatory/funding event ingested from a public source. */
export interface Opportunity {
  id: string;
  source: OpportunitySource;
  sourceId: string;
  type: OpportunityType;
  /** Typed taxonomy; null on rows ingested before the taxonomy migration. */
  eventType: EventType | null;
  title: string;
  agency: string | null;
  jurisdiction: string;
  domain: string | null;
  tags: string[];
  summary: string | null;
  url: string;
  openDate: string | null;
  deadline: string | null;
  /** Final rules: when the rule takes (or took) effect. */
  effectiveDate: string | null;
  /** Temporary rules / windows: when the authority or window lapses. */
  expirationDate: string | null;
  status: string | null;
}

/** An opportunity ranked against a saved project by the hybrid matcher. */
export interface RankedOpportunity extends Opportunity {
  relevance: number; // 0-100
  whyRelevant: string;
}

/** A row ready to upsert into the opportunities table (snake_case columns). */
export interface OpportunityRow {
  source: OpportunitySource;
  source_id: string;
  type: OpportunityType;
  event_type: EventType | null;
  title: string;
  agency: string | null;
  jurisdiction: string;
  domain: string | null;
  tags: string[];
  summary: string | null;
  url: string;
  open_date: string | null;
  deadline: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  status: string | null;
  raw: unknown;
}

/**
 * One "thing to consider" synthesized from a live web search of recent news,
 * policy, funding, and market signals relevant to the venture. Grounded in a
 * real source (never fabricated); the model attaches the source when it has one.
 */
export interface Consideration {
  /** One concise, specific, actionable sentence. */
  point: string;
  /** Short source name, e.g. "Reuters" or "CARB". */
  source: string | null;
  url: string | null;
}

/**
 * Portfolio mode (for VCs / platform teams): score a set of companies on the
 * non-dilutive capital and regulatory dimensions, grounded in real dated
 * opportunities. The qualitative axes (regClimate, policyRisk) are explicitly
 * model assessments; the `opportunities` list is real (dates + links).
 */

export type RegClimate = "tailwind" | "neutral" | "headwind";

/** A real, dated opportunity selected as evidence behind a company's score. */
export interface ScoredOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  agency: string | null;
  deadline: string | null;
  url: string;
  relevance: number; // 0-100
  whyRelevant: string;
}

export interface CompanyScore {
  /** 0-100: how much accessible non-dilutive capital / programs are within reach. */
  nonDilutive: number;
  /** Direction of the regulatory environment for this venture. */
  regClimate: RegClimate;
  regRationale: string;
  /** 0-100: dependence on policy/subsidy that could change (higher = riskier). */
  policyRisk: number;
  policyRationale: string;
  /** Named policy/subsidy dependencies to watch. */
  dependencies: string[];
  /** One-line synthesis. */
  summary: string;
  /** Real, dated programs/rules grounding the scores (deadlines + links). */
  opportunities: ScoredOpportunity[];
}

/**
 * Structured regulatory profile of a company — what the query generator and
 * scorer reason over instead of the bare description. Money flowing to a
 * company's partners, customers, or substitutes changes its market as much as
 * money flowing to the company itself, so the value chain is first-class.
 * Drafted by Claude, reviewable by the user.
 */
export interface CompanyGraph {
  sectors: string[];
  /** lender / marketplace / SaaS / provider / manufacturer / ... */
  businessModel: string | null;
  valueChain: {
    customers: string[];
    partners: string[];
    substitutes: string[];
    /** Who else funds the customer (federal aid, Medicaid, employers). */
    payersUpstream: string[];
  };
  regulatoryRegimes: {
    federal: string[];
    state: string[];
    agencies: string[];
  };
  operatingStates: string[];
  /** Auto-generated search phrases spanning the whole graph; editable. */
  keywordsExpanded: string[];
}

/** One company in a portfolio, with its (optional, lazily computed) score. */
export interface PortfolioCompany {
  id: string;
  name: string;
  description: string;
  sector: string | null;
  stage: string | null;
  geography: string | null;
  /** Optional homepage, used to ground web enrichment. */
  website: string | null;
  /** How the profile was produced: manual entry / CSV, or web-search draft. */
  profileSource: "manual" | "web";
  /** Structured regulatory profile; drafted at first scoring if absent. */
  graph?: CompanyGraph | null;
  /** Exit status from web research: IPO, acquired, shutdown, private, unknown. */
  exitType: "ipo" | "acquired" | "shutdown" | "private" | "unknown" | null;
  /** Short exit detail, e.g. "Acquired by Stripe (2023)". */
  exitNote: string | null;
  score: CompanyScore | null;
  scoredAt: string | null;
}

/** A named set of companies a signed-in user assesses together. */
export interface Portfolio {
  id: string;
  name: string;
  companies: PortfolioCompany[];
  createdAt: string;
}

/** A saved analysis belonging to a signed-in user. */
export interface Project {
  id: string;
  name: string;
  description: string;
  matches: EnrichedMatch[];
  followUps: FollowUp[];
  regulations: LiveRegResult[];
  considerations: Consideration[];
  createdAt: string;
}
