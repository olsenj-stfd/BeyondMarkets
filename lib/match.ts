import Anthropic from "@anthropic-ai/sdk";
import { records } from "@/data/records";
import type { EnrichedMatch, MatchResult } from "@/lib/types";

const MODEL = "claude-opus-4-7";
const MAX_MATCHES = 6;

/**
 * Compact view of the dataset sent to the model for ranking. Heavy fields
 * (context, howToEngage, link) are kept server-side and joined back locally,
 * so the cached prompt stays small.
 */
function datasetForPrompt(): string {
  return JSON.stringify(
    records.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      agency: r.agencyAcronym,
      level: r.level,
      jurisdiction: r.jurisdiction,
      summary: r.summary,
      applicability: r.applicability,
      tags: r.tags,
    })),
  );
}

const SYSTEM_INTRO = `You are a regulatory- and grant-intelligence analyst for early-stage ventures, specializing in California air-quality and climate technology.

You are given a catalog of regulations and grant/incentive programs. Given a company description, identify the records most relevant to that company and explain, specifically, how each one affects them.

Rules:
- Only select records from the provided catalog. Never invent records or IDs.
- Rank by genuine relevance to THIS company. It is fine to return fewer than the maximum if only a few are truly relevant; do not pad with weak matches.
- For each match, "whyRelevant" must be concrete and tailored to the company — name the specific exposure, opportunity, or action, not a generic restatement of the summary.
- "relevance" is 0-100, your confidence that this record materially matters to the company.
- Cover both obligations (regulations they may need to comply with) and opportunities (grants/incentives they could pursue) when both apply.

Here is the catalog (JSON):
`;

const matchTool: Anthropic.Tool = {
  name: "return_matches",
  description:
    "Return the ranked list of catalog records most relevant to the company.",
  input_schema: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        description: `Ranked most-relevant first, at most ${MAX_MATCHES} items.`,
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The id of a record from the catalog.",
            },
            relevance: {
              type: "number",
              description: "0-100 confidence that this record materially matters.",
            },
            whyRelevant: {
              type: "string",
              description:
                "Concrete, company-specific explanation of how this record affects them.",
            },
          },
          required: ["id", "relevance", "whyRelevant"],
        },
      },
    },
    required: ["matches"],
  },
};

export async function matchCompany(description: string): Promise<EnrichedMatch[]> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_INTRO + datasetForPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [matchTool],
    tool_choice: { type: "tool", name: "return_matches" },
    messages: [
      {
        role: "user",
        content: `Company description:\n\n${description}\n\nReturn the most relevant catalog records (at most ${MAX_MATCHES}).`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return structured matches.");
  }

  const raw = (toolUse.input as { matches?: MatchResult[] }).matches ?? [];
  const byId = new Map(records.map((r) => [r.id, r]));

  return raw
    .filter((m) => byId.has(m.id))
    .slice(0, MAX_MATCHES)
    .map((m) => ({
      id: m.id,
      relevance: Math.max(0, Math.min(100, Math.round(m.relevance))),
      whyRelevant: m.whyRelevant,
      record: byId.get(m.id)!,
    }));
}
