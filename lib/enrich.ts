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

export type ExitType =
  | "ipo"
  | "acquired"
  | "shutdown"
  | "private"
  | "unknown";

const EXIT_TYPES: ExitType[] = [
  "ipo",
  "acquired",
  "shutdown",
  "private",
  "unknown",
];

function asExitType(v: unknown): ExitType | null {
  return typeof v === "string" && (EXIT_TYPES as string[]).includes(v)
    ? (v as ExitType)
    : null;
}

export interface ExitInfo {
  /** Whether the company has IPO'd, been acquired, shut down, or is private. */
  exitType: ExitType | null;
  /** Short detail, e.g. "Acquired by Stripe (2023)" or "IPO Nasdaq 2024". */
  exitNote: string | null;
}

export interface CompanyProfile extends ExitInfo {
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
- Search specifically for whether the company has had an exit event — an IPO, an acquisition/merger, or a shutdown/wind-down. Set exitType to "ipo", "acquired", "shutdown", "private" (clearly still operating independently), or "unknown" (can't tell). Put a short detail in exitNote with the year and counterparty if known (e.g. "Acquired by Stripe (2023)", "IPO Nasdaq 2024", "Ceased operations 2023").
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
      exitType: {
        type: "string",
        enum: ["ipo", "acquired", "shutdown", "private", "unknown"],
      },
      exitNote: { type: "string" },
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
    exitType: null,
    exitNote: null,
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
    exitType: asExitType(input.exitType),
    exitNote: str(input.exitNote),
  };
}

const EXIT_SYSTEM = `You check whether a specific company has had a corporate exit event, for a venture investor tracking a portfolio.

Use web search (think recent news, press releases, SEC filings, Crunchbase). Determine whether the company has:
- IPO'd / gone public → exitType "ipo"
- been acquired or merged → exitType "acquired"
- shut down / wound down / ceased operations → exitType "shutdown"
- is clearly still operating independently and private → exitType "private"
- can't be determined → exitType "unknown"

Put a short detail in exitNote with the year and counterparty when known (e.g. "Acquired by Stripe (2023)", "IPO Nasdaq 2024", "Ceased operations 2023"). Base everything ONLY on what you find — never guess. Call return_exit when done.`;

const exitTool: Anthropic.Tool = {
  name: "return_exit",
  description: "Return the company's exit status.",
  input_schema: {
    type: "object",
    properties: {
      exitType: {
        type: "string",
        enum: ["ipo", "acquired", "shutdown", "private", "unknown"],
      },
      exitNote: { type: "string" },
    },
    required: ["exitType"],
  },
};

/**
 * Lightweight exit-status check for a company we already have a description for
 * (so we don't re-research the whole profile). Searches Google/news for IPO,
 * acquisition, or shutdown. Degrades to unknown on any failure.
 */
export async function checkExit(
  name: string,
  website: string | null,
  options?: { signal?: AbortSignal },
): Promise<ExitInfo> {
  const none: ExitInfo = { exitType: null, exitNote: null };
  if (!process.env.ANTHROPIC_API_KEY) return none;

  try {
    const client = new Anthropic();
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 512,
        system: EXIT_SYSTEM,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 2 },
          exitTool,
        ],
        messages: [
          {
            role: "user",
            content: `Check the exit status of this company via return_exit.\n\nName: ${name}${
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
        b.type === "tool_use" && b.name === "return_exit",
    );
    if (!toolUse) return none;
    const input = toolUse.input as Record<string, unknown>;
    return {
      exitType: asExitType(input.exitType),
      exitNote: str(input.exitNote),
    };
  } catch {
    return none;
  }
}
