import Anthropic from "@anthropic-ai/sdk";
import type {
  CompanyScore,
  Opportunity,
  PortfolioCompany,
  RegClimate,
  ScoredOpportunity,
} from "@/lib/types";
import { classify } from "@/lib/ingest/tag";

/**
 * Score one portfolio company on the dimensions a VC cares about:
 *   - non-dilutive capital within reach (grounded in real, dated programs),
 *   - regulatory climate (tailwind / neutral / headwind),
 *   - policy-dependency risk (how much of the thesis rides on a subsidy that
 *     could be repealed).
 *
 * The selected `opportunities` are REAL records from the ingested set (dates +
 * links come straight from the source). The qualitative axes are explicit model
 * assessments — never presented as fact, and always backed by the evidence list.
 */

const MODEL = "claude-sonnet-4-6";
const SHORTLIST = 40;
const MAX_EVIDENCE = 8;

/** Fold the structured fields into one text blob for classification + prompt. */
function companyText(c: PortfolioCompany): string {
  return [
    c.description.trim(),
    c.sector ? `Sector: ${c.sector}` : null,
    c.stage ? `Stage: ${c.stage}` : null,
    c.geography ? `Geography: ${c.geography}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Cheap deterministic prefilter: domain/tag overlap, nearest-deadline first. */
function prefilter(text: string, opportunities: Opportunity[]): Opportunity[] {
  const { tags } = classify(text);
  const upcoming = opportunities
    .filter((o) => o.deadline)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
  if (tags.length === 0) return upcoming.slice(0, SHORTLIST);

  const set = new Set(tags);
  const matched = upcoming.filter(
    (o) => (o.domain && set.has(o.domain)) || o.tags.some((t) => set.has(t)),
  );
  return (matched.length > 0 ? matched : upcoming).slice(0, SHORTLIST);
}

const scoreTool: Anthropic.Tool = {
  name: "score_company",
  description:
    "Return the portfolio-company assessment: selected real opportunities plus the non-dilutive, regulatory-climate, and policy-risk scores.",
  input_schema: {
    type: "object",
    properties: {
      selected: {
        type: "array",
        description: `Up to ${MAX_EVIDENCE} opportunities from the shortlist that genuinely apply, most relevant first. Only use provided ids.`,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            relevance: { type: "number", description: "0-100." },
            whyRelevant: {
              type: "string",
              description: "One concrete, company-specific sentence.",
            },
          },
          required: ["id", "relevance", "whyRelevant"],
        },
      },
      nonDilutive: {
        type: "number",
        description:
          "0-100: how much accessible non-dilutive capital / program fit is within reach, informed by the breadth and fit of the selected grant opportunities.",
      },
      regClimate: {
        type: "string",
        enum: ["tailwind", "neutral", "headwind"],
        description: "Direction of regulatory momentum for this venture.",
      },
      regRationale: {
        type: "string",
        description: "One sentence justifying the regClimate call.",
      },
      policyRisk: {
        type: "number",
        description:
          "0-100: how dependent the thesis is on a policy/subsidy that could change (higher = riskier).",
      },
      policyRationale: {
        type: "string",
        description: "One sentence on the main policy dependency or risk.",
      },
      dependencies: {
        type: "array",
        items: { type: "string" },
        description:
          "Named policy/subsidy dependencies to watch, e.g. 'IRA 45X credit', 'LCFS', 'ITC'.",
      },
      summary: {
        type: "string",
        description: "One-line synthesis for the portfolio rollup.",
      },
    },
    required: [
      "selected",
      "nonDilutive",
      "regClimate",
      "policyRisk",
      "summary",
    ],
  },
};

const SYSTEM = `You assess a single portfolio company for a climate/impact VC. You are given the company profile and a shortlist of REAL, dated opportunities (federal/California grant deadlines and regulatory comment periods).

Score it on:
- nonDilutive (0-100): how much accessible non-dilutive capital / program fit is within reach, judged from the breadth and fit of the selected GRANT opportunities. Few or weak fits → low.
- regClimate (tailwind/neutral/headwind): is regulatory momentum helping or hurting this sector right now?
- policyRisk (0-100): how much does the thesis depend on a specific subsidy/policy that could be repealed? Name the dependencies.

Rules:
- Only select opportunities from the provided shortlist; never invent opportunities, ids, or dates.
- The qualitative scores are your assessment — be calibrated and specific, not generic.
- "whyRelevant", rationales, and dependencies must be concrete and specific to THIS company.
- Do not restate or alter dates; the user sees real deadlines from the source records.`;

export async function scoreCompany(
  company: PortfolioCompany,
  opportunities: Opportunity[],
  options?: { signal?: AbortSignal },
): Promise<CompanyScore> {
  const text = companyText(company);
  const shortlist = prefilter(text, opportunities);

  const compact = shortlist.map((o) => ({
    id: o.id,
    type: o.type,
    title: o.title,
    agency: o.agency,
    jurisdiction: o.jurisdiction,
    domain: o.domain,
    summary: o.summary?.slice(0, 300) ?? null,
  }));

  const client = new Anthropic();
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: [scoreTool],
      tool_choice: { type: "tool", name: "score_company" },
      messages: [
        {
          role: "user",
          content: `Company profile:\n\n${text}\n\nShortlist (JSON):\n${JSON.stringify(
            compact,
          )}\n\nAssess this company and call score_company.`,
        },
      ],
    } as unknown as Anthropic.MessageStreamParams,
    { signal: options?.signal },
  );

  const message = await stream.finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Scoring returned no structured output.");
  }

  const input = toolUse.input as {
    selected?: { id: string; relevance: number; whyRelevant: string }[];
    nonDilutive?: number;
    regClimate?: string;
    regRationale?: string;
    policyRisk?: number;
    policyRationale?: string;
    dependencies?: string[];
    summary?: string;
  };

  // Resolve selected ids back to real records so deadlines + links are sourced.
  const byId = new Map(shortlist.map((o) => [o.id, o]));
  const opportunitiesOut: ScoredOpportunity[] = (input.selected ?? [])
    .filter((s) => byId.has(s.id))
    .slice(0, MAX_EVIDENCE)
    .map((s) => {
      const o = byId.get(s.id)!;
      return {
        id: o.id,
        title: o.title,
        type: o.type,
        agency: o.agency,
        deadline: o.deadline,
        url: o.url,
        relevance: clamp(s.relevance),
        whyRelevant: s.whyRelevant,
      };
    })
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));

  const regClimate: RegClimate =
    input.regClimate === "tailwind" || input.regClimate === "headwind"
      ? input.regClimate
      : "neutral";

  return {
    nonDilutive: clamp(input.nonDilutive ?? 0),
    regClimate,
    regRationale: input.regRationale?.trim() ?? "",
    policyRisk: clamp(input.policyRisk ?? 0),
    policyRationale: input.policyRationale?.trim() ?? "",
    dependencies: (input.dependencies ?? [])
      .filter((d) => typeof d === "string" && d.trim())
      .map((d) => d.trim())
      .slice(0, 6),
    summary: input.summary?.trim() ?? "",
    opportunities: opportunitiesOut,
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
