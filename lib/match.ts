import Anthropic from "@anthropic-ai/sdk";
import { records } from "@/data/records";
import type { EnrichedMatch, FollowUp, MatchResult } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";
const MAX_MATCHES = 5;
const MAX_CHECKLIST = 4;
const MAX_KEY_DATES = 3;
// Cap output so a single analysis can't run past the serverless duration limit.
const MAX_OUTPUT_TOKENS = 3072;

/**
 * Compact view of the dataset sent to the model for ranking. Heavy fields
 * (context, howToEngage, link) are kept server-side and joined back locally,
 * so the cached prompt stays small.
 */
function datasetForPrompt(): string {
  return JSON.stringify(
    // Regulations are now sourced live (eCFR + Federal Register) in the
    // Regulations column, so the curated matcher only ranks grants + partners.
    records
      .filter((r) => r.type !== "regulation")
      .map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      agency: r.agencyAcronym,
      level: r.level,
      jurisdiction: r.jurisdiction,
      domain: r.domain,
      summary: r.summary,
      applicability: r.applicability,
      tags: r.tags,
    })),
  );
}

const SYSTEM_INTRO = `You are a grant- and partnership-intelligence analyst for climate and impact ventures operating in the United States. Your scope is FEDERAL and CALIFORNIA only — across every relevant domain (air, water, energy, climate disclosure, transportation, materials/circular economy, and cross-cutting).

You are given a catalog with two kinds of records:
- "grant": grants, vouchers, rebates, loans, and tax credits a company could pursue.
- "partner": ecosystem organizations (accelerators, incubators, fellowships, national labs) and capital partners (green banks, project finance, climate VC) a company could engage.

(Specific regulations are handled separately by a live full-text search, so you do NOT rank regulations here.)

Given a company description, select the records most relevant to that company across BOTH kinds, and explain specifically how each matters.

Rules:
- Only select records from the provided catalog. Never invent records, IDs, grants, or partners.
- Aim for genuine breadth: surface relevant items from both kinds when they apply. Do not return only grants.
- Rank by genuine relevance to THIS company. Return fewer items rather than padding with weak matches.
- For each match, "whyRelevant" must be concrete and tailored — name the specific exposure, opportunity, or fit, not a generic restatement of the summary.
- For each match, "checklist" is 3-4 short, high-level, company-specific action items (imperative voice, e.g. "Confirm your facility's potential-to-emit before signing a lease"). This is the at-a-glance summary of what to do next. Keep each item to one concise line.
- For each match, "keyDates" is 0-3 short notes on TIMING to get involved in the regulatory or funding process: recurring deadlines (e.g. an annual report due date), public comment periods, and whether the agency holds public workshops or hearings — plus where to find the current schedule. CRITICAL: do NOT invent specific one-off calendar dates you are not certain of. Describe the cadence (annual, rolling, per-rulemaking) and point to the official source to confirm; prefix anything you are not certain about with "Verify:". Regulations and grant solicitation windows usually have keyDates; partners often have none (return an empty array then).
- "relevance" is 0-100: your confidence that this record materially matters to the company.

Also produce "followUps": 2-3 MULTIPLE-CHOICE questions whose answers would let you sharpen or expand the next pass. Each followUp has a short "question" and 2-4 short, concrete, mutually-distinct "options" the user can pick from (e.g. where they operate, their stage, revenue band, or whether they handle hazardous materials). These supplement the results — never a reason to withhold matches.

Here is the catalog (JSON):
`;

const matchTool: Anthropic.Tool = {
  name: "return_matches",
  description:
    "Return the ranked catalog records most relevant to the company, plus multiple-choice follow-up questions to refine the next pass.",
  input_schema: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        description: `Ranked most-relevant first, at most ${MAX_MATCHES} items, spanning grants and partners as relevant.`,
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
            checklist: {
              type: "array",
              description:
                "3-4 short, high-level, company-specific action items (imperative voice).",
              items: { type: "string" },
            },
            keyDates: {
              type: "array",
              description:
                "0-3 short timing notes (recurring deadlines, comment periods, workshops/hearings cadence + where to confirm). No fabricated specific dates; prefix uncertain notes with 'Verify:'.",
              items: { type: "string" },
            },
          },
          required: ["id", "relevance", "whyRelevant", "checklist", "keyDates"],
        },
      },
      followUps: {
        type: "array",
        description:
          "2-3 multiple-choice questions that would sharpen or expand the next pass.",
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "A short refining question." },
            options: {
              type: "array",
              description: "2-4 short, concrete, mutually-distinct answer choices.",
              items: { type: "string" },
            },
          },
          required: ["question", "options"],
        },
      },
    },
    required: ["matches", "followUps"],
  },
};

/**
 * A fast, cheap best-guess label for a saved project, derived from the company
 * description. Falls back to a truncation if the model call fails or there's no
 * API key — the title is convenience, never worth failing the save over.
 */
export async function suggestProjectName(description: string): Promise<string> {
  const fallback = description.trim().slice(0, 60) || "Untitled venture";
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 40,
      messages: [
        {
          role: "user",
          content: `Write a short, specific project title (4-8 words, no quotes, no trailing period) that summarizes this venture for a saved-project label. Reply with only the title.\n\n${description}`,
        },
      ],
    });
    const text = msg.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    )?.text;
    const name = (text ?? "").trim().replace(/^["']|["']$/g, "").slice(0, 80);
    return name || fallback;
  } catch {
    return fallback;
  }
}

export async function matchCompany(
  description: string,
  options?: { signal?: AbortSignal },
): Promise<{ matches: EnrichedMatch[]; followUps: FollowUp[] }> {
  const client = new Anthropic();

  // effort is GA on the API but not yet in this SDK's types; cast to pass it through.
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: "low" },
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
          content: `Company description:\n\n${description}\n\nReturn the most relevant catalog records (at most ${MAX_MATCHES}) across grants and partners, plus 2-3 multiple-choice follow-up questions.`,
        },
      ],
    } as unknown as Anthropic.MessageStreamParams,
    { signal: options?.signal },
  );

  const message = await stream.finalMessage();

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return structured matches.");
  }

  const input = toolUse.input as {
    matches?: (MatchResult & { keyDates?: string[] })[];
    followUps?: FollowUp[];
  };

  const byId = new Map(records.map((r) => [r.id, r]));

  const matches: EnrichedMatch[] = (input.matches ?? [])
    // Keep only catalog grants/partners; regulations are sourced live elsewhere.
    .filter((m) => byId.get(m.id)?.type === "grant" || byId.get(m.id)?.type === "partner")
    .slice(0, MAX_MATCHES)
    .map((m) => ({
      id: m.id,
      relevance: Math.max(0, Math.min(100, Math.round(m.relevance))),
      whyRelevant: m.whyRelevant,
      checklist: Array.isArray(m.checklist)
        ? m.checklist.slice(0, MAX_CHECKLIST)
        : [],
      keyDates: Array.isArray(m.keyDates) ? m.keyDates.slice(0, MAX_KEY_DATES) : [],
      record: byId.get(m.id)!,
    }));

  const followUps: FollowUp[] = (input.followUps ?? [])
    .filter((f) => f && f.question && Array.isArray(f.options) && f.options.length > 0)
    .slice(0, 3)
    .map((f) => ({ question: f.question, options: f.options.slice(0, 4) }));

  return { matches, followUps };
}
