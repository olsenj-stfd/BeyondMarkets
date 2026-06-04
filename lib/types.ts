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
}

export interface MatchResponse {
  matches: MatchResult[];
  /** 2-3 questions that would sharpen the next pass. */
  followUps: string[];
}

/** A match joined with its full record, for rendering. */
export interface EnrichedMatch extends MatchResult {
  record: RegRecord;
}
