import Anthropic from "@anthropic-ai/sdk";
import type { CompanyGraph, PortfolioCompany } from "@/lib/types";

/**
 * Draft a company's regulatory graph from its (already-known) profile. No web
 * search — this is derivation, not research: mapping what the company does to
 * the value-chain nodes and regulatory regimes that govern it. The graph
 * drives query generation and matching against REAL ingested events; a wrong
 * guess here costs recall, never a fabricated fact shown to the user.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 1200;
const MAX_LIST = 8;
const MAX_KEYWORDS = 20;

const SYSTEM = `You map a company to its regulatory graph for a venture investor's regulatory scanner. Think about the WHOLE value chain — regulation and money reach a company through its customers, partners, and substitutes, not just directly.

Field guidance:
- sectors: 1-4 short labels (e.g. "consumer lending", "workforce training", "edtech").
- businessModel: one word/phrase (lender / marketplace / SaaS / provider / manufacturer / ...).
- valueChain.customers: who pays or uses it (e.g. "adult learners", "career changers").
- valueChain.partners: who it distributes through or depends on (e.g. "bootcamps", "trade schools").
- valueChain.substitutes: what replaces it for the customer (e.g. "Pell Grants", "WIOA ITAs", "employer tuition benefit").
- valueChain.payersUpstream: who else funds its customers (federal student aid, Medicaid, employers).
- regulatoryRegimes.federal: statutes/regimes (e.g. "TILA/Reg Z", "CFPA/UDAAP", "HEA Title IV", "WIOA").
- regulatoryRegimes.state: state-level regimes (e.g. "CA CFL license", "student loan servicing acts").
- regulatoryRegimes.agencies: regulators that matter (e.g. "CFPB", "ED", "DOL", "CA DFPI", "state AGs").
- operatingStates: two-letter or full state names if stated/inferable; empty if unknown.
- keywordsExpanded: 10-${MAX_KEYWORDS} SEARCH phrases spanning the whole graph — statute names, program names, license types, substitute programs (e.g. "workforce Pell", "income share agreement", "eligible training provider", "student loan servicing license"). These power full-text search of federal/state records, so prefer the terms a regulator would use, NOT the company's marketing language.

Be specific to THIS company. Empty arrays are fine where you don't know. Call return_graph when done.`;

const graphTool: Anthropic.Tool = {
  name: "return_graph",
  description: "Return the company's regulatory graph.",
  input_schema: {
    type: "object",
    properties: {
      sectors: { type: "array", items: { type: "string" } },
      businessModel: { type: "string" },
      customers: { type: "array", items: { type: "string" } },
      partners: { type: "array", items: { type: "string" } },
      substitutes: { type: "array", items: { type: "string" } },
      payersUpstream: { type: "array", items: { type: "string" } },
      regimesFederal: { type: "array", items: { type: "string" } },
      regimesState: { type: "array", items: { type: "string" } },
      agencies: { type: "array", items: { type: "string" } },
      operatingStates: { type: "array", items: { type: "string" } },
      keywordsExpanded: { type: "array", items: { type: "string" } },
    },
    required: [
      "sectors",
      "customers",
      "partners",
      "substitutes",
      "regimesFederal",
      "agencies",
      "keywordsExpanded",
    ],
  },
};

function strList(v: unknown, cap = MAX_LIST): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, cap);
}

export async function draftGraph(
  company: Pick<
    PortfolioCompany,
    "name" | "description" | "sector" | "stage" | "geography"
  >,
  options?: { signal?: AbortSignal },
): Promise<CompanyGraph> {
  const profile = [
    `Name: ${company.name}`,
    `Description: ${company.description}`,
    company.sector ? `Sector: ${company.sector}` : null,
    company.stage ? `Stage: ${company.stage}` : null,
    company.geography ? `Geography: ${company.geography}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic();
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: [graphTool],
      tool_choice: { type: "tool", name: "return_graph" },
      messages: [
        {
          role: "user",
          content: `Company profile:\n\n${profile}\n\nMap the regulatory graph via return_graph.`,
        },
      ],
    } as unknown as Anthropic.MessageStreamParams,
    { signal: options?.signal },
  );

  const message = await stream.finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("Graph drafting returned no structured output.");

  const input = toolUse.input as Record<string, unknown>;
  return {
    sectors: strList(input.sectors, 4),
    businessModel:
      typeof input.businessModel === "string" && input.businessModel.trim()
        ? input.businessModel.trim()
        : null,
    valueChain: {
      customers: strList(input.customers),
      partners: strList(input.partners),
      substitutes: strList(input.substitutes),
      payersUpstream: strList(input.payersUpstream),
    },
    regulatoryRegimes: {
      federal: strList(input.regimesFederal),
      state: strList(input.regimesState),
      agencies: strList(input.agencies),
    },
    operatingStates: strList(input.operatingStates),
    keywordsExpanded: strList(input.keywordsExpanded, MAX_KEYWORDS),
  };
}
