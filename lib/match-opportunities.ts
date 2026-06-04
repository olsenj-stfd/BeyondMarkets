import Anthropic from "@anthropic-ai/sdk";
import type { Opportunity, RankedOpportunity } from "@/lib/types";
import { classify } from "@/lib/ingest/tag";

const MODEL = "claude-sonnet-4-6";
const SHORTLIST = 40; // cap the LLM input after the cheap prefilter
const MAX_RANKED = 12;

/**
 * Stage 1 (cheap, deterministic): keep opportunities whose domain/tags overlap
 * the project's classified domains. If nothing overlaps, fall back to the
 * nearest-deadline items so the dashboard is never empty. Always
 * nearest-deadline first, capped at SHORTLIST.
 */
function prefilter(description: string, opportunities: Opportunity[]): Opportunity[] {
  const { tags: projectDomains } = classify(description);
  const upcoming = opportunities
    .filter((o) => o.deadline)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));

  if (projectDomains.length === 0) return upcoming.slice(0, SHORTLIST);

  const domainSet = new Set(projectDomains);
  const matched = upcoming.filter(
    (o) =>
      (o.domain && domainSet.has(o.domain)) ||
      o.tags.some((t) => domainSet.has(t)),
  );

  return (matched.length > 0 ? matched : upcoming).slice(0, SHORTLIST);
}

const rankTool: Anthropic.Tool = {
  name: "rank_opportunities",
  description:
    "Return the shortlisted opportunities most relevant to the company, ranked, with a concrete reason for each.",
  input_schema: {
    type: "object",
    properties: {
      ranked: {
        type: "array",
        description: `Most-relevant first, at most ${MAX_RANKED} items. Drop opportunities that don't genuinely apply.`,
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "The id of a shortlisted opportunity." },
            relevance: {
              type: "number",
              description: "0-100 confidence that this opportunity materially matters.",
            },
            whyRelevant: {
              type: "string",
              description:
                "One concrete, company-specific sentence on why this deadline matters to them.",
            },
          },
          required: ["id", "relevance", "whyRelevant"],
        },
      },
    },
    required: ["ranked"],
  },
};

const SYSTEM = `You rank time-sensitive opportunities (federal/California grant deadlines and regulatory comment periods) for a climate or impact venture. You are given the company description and a shortlist of REAL, dated opportunities. Select the ones that genuinely matter to THIS company and rank them by relevance.

Rules:
- Only select from the provided shortlist. Never invent opportunities or ids.
- Be selective: return fewer items rather than padding with weak matches. It is fine to return only a few.
- "whyRelevant" must be concrete and specific to this company — name the exposure or the fit, not a generic restatement.
- Do not mention or alter any dates; the deadline is shown to the user from the source record.`;

/**
 * Hybrid match: deterministic prefilter, then a single LLM ranking pass over
 * the shortlist. Returns full opportunities (with their real dates) annotated
 * with relevance + reason, nearest-deadline first.
 */
export async function rankOpportunities(
  description: string,
  opportunities: Opportunity[],
): Promise<RankedOpportunity[]> {
  const shortlist = prefilter(description, opportunities);
  if (shortlist.length === 0) return [];

  const compact = shortlist.map((o) => ({
    id: o.id,
    type: o.type,
    title: o.title,
    agency: o.agency,
    jurisdiction: o.jurisdiction,
    domain: o.domain,
    summary: o.summary?.slice(0, 400) ?? null,
  }));

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    output_config: { effort: "low" },
    system: SYSTEM,
    tools: [rankTool],
    tool_choice: { type: "tool", name: "rank_opportunities" },
    messages: [
      {
        role: "user",
        content: `Company description:\n\n${description}\n\nShortlist (JSON):\n${JSON.stringify(
          compact,
        )}\n\nReturn the opportunities that genuinely matter, ranked (at most ${MAX_RANKED}).`,
      },
    ],
  } as unknown as Anthropic.MessageStreamParams);

  const message = await stream.finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) return [];

  const input = toolUse.input as {
    ranked?: { id: string; relevance: number; whyRelevant: string }[];
  };

  const byId = new Map(shortlist.map((o) => [o.id, o]));
  const ranked: RankedOpportunity[] = (input.ranked ?? [])
    .filter((r) => byId.has(r.id))
    .slice(0, MAX_RANKED)
    .map((r) => ({
      ...byId.get(r.id)!,
      relevance: Math.max(0, Math.min(100, Math.round(r.relevance))),
      whyRelevant: r.whyRelevant,
    }));

  // Dashboard is a calendar: nearest deadline first.
  return ranked.sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
}
