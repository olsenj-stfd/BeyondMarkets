import Anthropic from "@anthropic-ai/sdk";

/**
 * Web-research a company profile from just a name (and optional website), so a
 * VC can paste a list of portfolio companies and get them auto-profiled before
 * scoring. Uses Claude's server-side web search. Grounded only — if the company
 * can't be found, fields are left null rather than invented; the draft is meant
 * to be reviewed/edited by the user.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 1024;
const MAX_SEARCHES = 3;

export interface CompanyProfile {
  description: string | null;
  sector: string | null;
  stage: string | null;
  geography: string | null;
  website: string | null;
}

const SYSTEM = `You research a company from its name (and website if given) and return a short, factual profile for a venture investor.

Rules:
- Use web search. Base every field ONLY on what you actually find.
- description: 1-2 sentences on what the company does (product, technology, customers). Concrete, not marketing fluff.
- sector: a short label (e.g. "Carbon removal", "Grid software", "Sustainable materials").
- stage: rough funding stage if discoverable ("Seed", "Series A", etc.), else null.
- geography: HQ or main operating location if discoverable, else null.
- website: the official homepage URL if found, else null.
- If you cannot confidently identify the company, leave fields null rather than guessing. Never fabricate.
- When done, call return_profile.`;

const returnTool: Anthropic.Tool = {
  name: "return_profile",
  description: "Return the researched company profile.",
  input_schema: {
    type: "object",
    properties: {
      description: { type: "string" },
      sector: { type: "string" },
      stage: { type: "string" },
      geography: { type: "string" },
      website: { type: "string" },
    },
    required: [],
  },
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function enrichCompany(
  name: string,
  website: string | null,
  options?: { signal?: AbortSignal },
): Promise<CompanyProfile> {
  const empty: CompanyProfile = {
    description: null,
    sector: null,
    stage: null,
    geography: null,
    website: website ?? null,
  };
  if (!process.env.ANTHROPIC_API_KEY) return empty;

  const client = new Anthropic();
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES },
        returnTool,
      ],
      messages: [
        {
          role: "user",
          content: `Research this company and return a profile via return_profile.\n\nName: ${name}${
            website ? `\nWebsite: ${website}` : ""
          }`,
        },
      ],
    },
    { signal: options?.signal },
  );

  const message = await stream.finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "return_profile",
  );
  if (!toolUse) return empty;

  const input = toolUse.input as Record<string, unknown>;
  const url = str(input.website);
  return {
    description: str(input.description),
    sector: str(input.sector),
    stage: str(input.stage),
    geography: str(input.geography),
    website: url && /^https?:\/\//.test(url) ? url : (website ?? null),
  };
}
