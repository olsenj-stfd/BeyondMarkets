import Anthropic from "@anthropic-ai/sdk";
import type { Consideration } from "@/lib/types";

/**
 * Live web-research digest: search recent news, policy moves, funding, and
 * market/competitive signals relevant to a venture, then synthesize a short
 * "things to consider" list with sources.
 *
 * Uses Claude's server-side web search tool (the model runs the searches on
 * Anthropic's infrastructure within a single request) plus a custom return
 * tool for structured output. Grounded only — every bullet should trace to
 * something found; nothing is fabricated. Degrades to [] on any failure so it
 * can never break the project page.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 2048;
const MAX_SEARCHES = 5;
const MAX_CONSIDERATIONS = 7;

const SYSTEM = `You are a research analyst briefing the founder of a climate/impact venture. Using web search, find what's happening RIGHT NOW that this specific venture should be aware of, then distill it into a short "things to consider" list.

Search for recent (prefer the last 12-18 months), concrete signals across:
- Policy & regulation: new or proposed rules, enforcement trends, standards, deadlines (federal and California).
- Funding: relevant grant programs, solicitations, tax credits, notable rounds in the space.
- Market & competition: notable competitors, demand signals, pricing, supply-chain or technology shifts.
- Risks & headwinds: litigation, program cuts, political/budget risk, permitting bottlenecks.

Rules:
- Be SPECIFIC to this venture's technology, sector, and location — no generic startup advice.
- Each point must be grounded in something you actually found. Do NOT invent facts, figures, dates, or sources.
- Each point is ONE concise, actionable sentence. Prefer the recent and decision-relevant.
- Attach the most relevant source (name + URL) for each point when you have one.
- When done searching, call return_considerations with ${MAX_CONSIDERATIONS} or fewer points. Do not also write prose.`;

const returnTool: Anthropic.Tool = {
  name: "return_considerations",
  description:
    "Return the web-research digest as structured 'things to consider' bullets.",
  input_schema: {
    type: "object",
    properties: {
      considerations: {
        type: "array",
        description: `Up to ${MAX_CONSIDERATIONS} concise, specific, venture-relevant points, each grounded in a real finding.`,
        items: {
          type: "object",
          properties: {
            point: {
              type: "string",
              description: "One concise, actionable sentence.",
            },
            source: {
              type: "string",
              description: "Short source name, e.g. 'Reuters' or 'CARB'.",
            },
            url: { type: "string", description: "Source URL, if available." },
          },
          required: ["point"],
        },
      },
    },
    required: ["considerations"],
  },
};

export async function webDigest(
  description: string,
  options?: { signal?: AbortSignal },
): Promise<Consideration[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  try {
    const client = new Anthropic();
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM,
        // Server-side web search + a custom structured-return tool. Leave
        // tool_choice on auto so the model can search first, then return.
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES },
          returnTool,
        ],
        messages: [
          {
            role: "user",
            content: `Venture to research:\n\n${description}\n\nSearch the web, then return the most decision-relevant "things to consider" via return_considerations.`,
          },
        ],
      },
      { signal: options?.signal },
    );

    const message = await stream.finalMessage();

    const toolUse = message.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === "return_considerations",
    );
    if (!toolUse) return [];

    const input = toolUse.input as {
      considerations?: { point?: unknown; source?: unknown; url?: unknown }[];
    };

    return (input.considerations ?? [])
      .filter((c) => typeof c?.point === "string" && c.point.trim().length > 0)
      .slice(0, MAX_CONSIDERATIONS)
      .map((c) => ({
        point: (c.point as string).trim(),
        source: typeof c.source === "string" && c.source.trim() ? c.source.trim() : null,
        url: typeof c.url === "string" && /^https?:\/\//.test(c.url) ? c.url : null,
      }));
  } catch {
    return [];
  }
}
