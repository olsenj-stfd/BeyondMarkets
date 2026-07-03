import Anthropic from "@anthropic-ai/sdk";
import type {
  CompanyScore,
  DependencyDetail,
  FlowDirection,
  Opportunity,
  PortfolioCompany,
  RegClimate,
  ScoredOpportunity,
} from "@/lib/types";
import { classify } from "@/lib/ingest/tag";
import { expandTerms } from "@/lib/synonyms";

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
const SHORTLIST = 60;
const MAX_EVIDENCE = 8;

/** Fold the structured fields into one text blob for classification + prompt. */
function companyText(c: PortfolioCompany): string {
  const g = c.graph;
  return [
    c.description.trim(),
    c.sector ? `Sector: ${c.sector}` : null,
    c.stage ? `Stage: ${c.stage}` : null,
    c.geography ? `Geography: ${c.geography}` : null,
    g?.businessModel ? `Business model: ${g.businessModel}` : null,
    g && g.valueChain.customers.length > 0
      ? `Customers: ${g.valueChain.customers.join(", ")}`
      : null,
    g && g.valueChain.partners.length > 0
      ? `Partners (money/rules reaching them reach us): ${g.valueChain.partners.join(", ")}`
      : null,
    g && g.valueChain.substitutes.length > 0
      ? `Substitutes (subsidies to these reshape our market): ${g.valueChain.substitutes.join(", ")}`
      : null,
    g && g.valueChain.payersUpstream.length > 0
      ? `Upstream payers: ${g.valueChain.payersUpstream.join(", ")}`
      : null,
    g && g.regulatoryRegimes.federal.length > 0
      ? `Federal regimes: ${g.regulatoryRegimes.federal.join(", ")}`
      : null,
    g && g.regulatoryRegimes.state.length > 0
      ? `State regimes: ${g.regulatoryRegimes.state.join(", ")}`
      : null,
    g && g.regulatoryRegimes.agencies.length > 0
      ? `Key regulators: ${g.regulatoryRegimes.agencies.join(", ")}`
      : null,
    g && g.operatingStates.length > 0
      ? `Operating states: ${g.operatingStates.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Query terms spanning the WHOLE graph — company keywords plus every value-
 * chain node and regime, expanded with regulator vocabulary. A grant to the
 * company's partners or a rule governing its substitutes matches even when
 * the company's own description never uses those words.
 */
function queryTerms(c: PortfolioCompany): string[] {
  const g = c.graph;
  const raw = [
    ...(g?.keywordsExpanded ?? []),
    ...(g?.valueChain.customers ?? []),
    ...(g?.valueChain.partners ?? []),
    ...(g?.valueChain.substitutes ?? []),
    ...(g?.valueChain.payersUpstream ?? []),
    ...(g?.regulatoryRegimes.federal ?? []),
    ...(g?.regulatoryRegimes.state ?? []),
    ...(g?.regulatoryRegimes.agencies ?? []),
    ...(g?.sectors ?? []),
    ...(c.sector ? [c.sector] : []),
  ];
  return expandTerms(raw).filter((t) => t.length >= 3);
}

/**
 * Deterministic prefilter over the temporally-relevant event set: score each
 * event by graph-term hits in its text plus domain-tag overlap, keep the top
 * SHORTLIST. Term hits outrank bare domain overlap so value-chain-specific
 * items (e.g. a substitute program) beat generic same-domain noise.
 */
function prefilter(company: PortfolioCompany, events: Opportunity[]): Opportunity[] {
  const { tags } = classify(companyText(company));
  const tagSet = new Set(tags);
  const terms = queryTerms(company);

  const scored = events.map((o) => {
    const text = `${o.title} ${o.summary ?? ""} ${o.agency ?? ""}`.toLowerCase();
    let hits = 0;
    for (const term of terms) {
      if (text.includes(term)) hits += 1;
    }
    const domainHit =
      (o.domain && tagSet.has(o.domain)) || o.tags.some((t) => tagSet.has(t));
    return { o, score: hits * 3 + (domainHit ? 1 : 0) };
  });

  const nearestDate = (o: Opportunity) =>
    o.deadline ?? o.effectiveDate ?? o.expirationDate ?? "9999";

  return scored
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || nearestDate(a.o).localeCompare(nearestDate(b.o)),
    )
    .slice(0, SHORTLIST)
    .map((s) => s.o);
}

const scoreTool: Anthropic.Tool = {
  name: "score_company",
  description:
    "Return the portfolio-company regulatory assessment: selected real events with node/mechanism analysis, the defining event, funding flows, enforcement precedent, and the watch item.",
  input_schema: {
    type: "object",
    properties: {
      selected: {
        type: "array",
        description: `Up to ${MAX_EVIDENCE} events from the shortlist that genuinely apply, most relevant first. Only use provided ids. An item qualifies ONLY if you can name the affected value-chain node and the mechanism — discard surface-keyword matches.`,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            relevance: { type: "number", description: "0-100." },
            affectedNode: {
              type: "string",
              description:
                "Which value-chain node this hits: the company itself, its customers, partners, substitutes, or upstream payers — name the specific node.",
            },
            mechanism: {
              type: "string",
              description:
                "How it changes the money, the rules, or the enforcement risk for that node. One concrete sentence.",
            },
            direction: {
              type: "string",
              enum: ["tailwind", "headwind", "both"],
            },
            whyRelevant: {
              type: "string",
              description:
                "Optional extra context ONLY when the mechanism doesn't already say it — usually omit.",
            },
            position: {
              type: "string",
              description:
                "Open rulemakings/bills only: the concrete position this company could credibly take.",
            },
            entityGate: {
              type: "string",
              description:
                "Set ONLY when eligibility likely excludes the company itself (e.g. 'nonprofit-only — for-profit ineligible; relevant via partners'). Never present gated grants as direct money.",
            },
          },
          required: ["id", "relevance", "affectedNode", "mechanism", "direction"],
        },
      },
      definingEvent: {
        type: "object",
        description:
          "The ONE development that most reshapes this company's market — a pending-effective final rule or enacted law counts as much as an open docket. eventId must be a shortlist id; use null ONLY if the defining event is not in the shortlist, and then say so explicitly in the analysis (it is a feed-coverage gap, not a fact you may cite).",
        properties: {
          eventId: { type: ["string", "null"] },
          title: { type: "string" },
          analysis: {
            type: "string",
            description:
              "2-4 sentences: what changes, when, and the both-ways effects on this company's market.",
          },
        },
        required: ["title", "analysis"],
      },
      nonDilutive: {
        type: "number",
        description:
          "0-100: direct grant reach — money THIS company could win itself. Entity-gated grants do not count toward this.",
      },
      ecosystemDirection: {
        type: "string",
        enum: ["tailwind", "headwind", "both"],
        description: "Net direction of money flowing to customers/partners/substitutes.",
      },
      ecosystemAnalysis: {
        type: "string",
        description:
          "1-3 sentences on ecosystem funding flows, with both-ways effects made explicit (e.g. 'subsidizes accredited substitutes, leaving non-accredited partners private-financing-only — a gap-financing opening above the award').",
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
          "0-100: how dependent the thesis is on a policy/subsidy that could change (higher = more dependent).",
      },
      policyRationale: {
        type: "string",
        description: "One sentence on the main policy dependency.",
      },
      dependencies: {
        type: "array",
        description:
          "Named policy/subsidy dependencies tied to tracked events where possible.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "e.g. 'HEA Title IV', 'IRA 45X'." },
            eventRef: {
              type: ["string", "null"],
              description:
                "Shortlist event id when one tracks this dependency; else a statute/docket/bill reference string; else null.",
            },
            direction: { type: "string", enum: ["tailwind", "headwind", "both"] },
          },
          required: ["name", "direction"],
        },
      },
      enforcementPrecedent: {
        type: ["string", "null"],
        description:
          "Controlling enforcement precedent for this business model, drawn ONLY from enforcement_action items in the shortlist (cite their titles). If the shortlist has none, return null — never recall precedent from memory.",
      },
      regimeShift: {
        type: "object",
        description:
          "Structural-change signal: fire when enforcement + intermediary items in the shortlist indicate a regime shift (e.g. federal enforcement retreating, state AGs filling the void) even with no single docket open.",
        properties: {
          fired: { type: "boolean" },
          rationale: { type: "string" },
        },
        required: ["fired"],
      },
      watchItem: {
        type: "object",
        description:
          "The single highest-signal upcoming date/window for this company, stated concretely. eventId must be a shortlist id when the item is tracked (its real date is attached server-side); otherwise null.",
        properties: {
          eventId: { type: ["string", "null"] },
          what: { type: "string" },
        },
        required: ["what"],
      },
      summary: {
        type: "string",
        description: "One-line synthesis for the portfolio rollup.",
      },
    },
    required: [
      "selected",
      "definingEvent",
      "nonDilutive",
      "regClimate",
      "policyRisk",
      "summary",
      "watchItem",
    ],
  },
};

const SYSTEM = `You assess a single portfolio company for a mission-driven VC's regulatory scanner. You get (a) the company profile INCLUDING its value-chain graph (customers, partners, substitutes, upstream payers, regimes) and (b) a shortlist of REAL tracked events: grants (open + forecasted), open comment periods, final rules pending or recently effective, moving bills, enforcement actions, guidance, and analyst signals — each with its real dates.

Produce the five-part insight:
1. definingEvent — the one development that most reshapes this company's market. A final rule with a future effective date or an enacted law in implementation usually outranks an open comment period. Analyze effects that cut both ways.
2. Funding flows — nonDilutive (0-100) counts ONLY money the company itself could win (respect entity gates); ecosystemDirection/ecosystemAnalysis cover money flowing to customers, partners, and substitutes — flag when a subsidy to substitutes is simultaneously a headwind and a product opening.
3. Rulemakings & positions — for open comment periods and moving bills you select, give the concrete position the company could credibly take.
4. enforcementPrecedent — only from enforcement_action items actually in the shortlist. None there → null. Never from memory.
5. watchItem — the single most important upcoming dated thing to monitor.

Selection discipline:
- Only use shortlist ids; never invent events, ids, or dates. Dates shown to the user come from the source records.
- Select an item ONLY if you can name the affected value-chain node AND the mechanism (does it change the money, the rules, or the enforcement risk?). A keyword overlap with no nameable node+mechanism is a discard — e.g. a generic SEC reporting rule does not affect a training-finance company's value chain.
- Money to the company's PARTNERS or CUSTOMERS or a rule governing its SUBSTITUTES is in scope — that is the point of the graph.
- When a grant's eligibility likely excludes the company (nonprofit-only, government-only), set entityGate and do not count it in nonDilutive; select it anyway if it moves the ecosystem.
- The "summary" must be informative on its own — what IS and ISN'T happening and what it means — never a verdict about the shortlist ("weak fit with the shortlist" is banned). If little matched, say plainly that the tracked federal/state feeds show little touching this company right now.
- regimeShift: look across enforcement + intermediary items for structural change no single docket shows.
- Be calibrated and specific to THIS company; generic sector talk is a defect.
- BREVITY: every text field is ONE tight sentence (definingEvent.analysis may be 2-3). Omit whyRelevant unless it adds something the mechanism doesn't. This runs under a hard time cap — long prose causes timeouts.`;

export async function scoreCompany(
  company: PortfolioCompany,
  opportunities: Opportunity[],
  options?: { signal?: AbortSignal },
): Promise<CompanyScore> {
  const text = companyText(company);
  const shortlist = prefilter(company, opportunities);

  const compact = shortlist.map((o) => ({
    id: o.id,
    event: o.eventType ?? o.type,
    title: o.title,
    agency: o.agency,
    jurisdiction: o.jurisdiction,
    domain: o.domain,
    deadline: o.deadline,
    effectiveDate: o.effectiveDate,
    expirationDate: o.expirationDate,
    published: o.openDate,
    summary: o.summary?.slice(0, 300) ?? null,
  }));

  const client = new Anthropic();
  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 2000,
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

  interface SelectedIn {
    id: string;
    relevance: number;
    affectedNode?: string;
    mechanism?: string;
    direction?: string;
    whyRelevant?: string;
    position?: string;
    entityGate?: string;
  }
  interface DependencyIn {
    name: string;
    eventRef?: string | null;
    direction?: string;
  }
  const input = toolUse.input as {
    selected?: SelectedIn[];
    definingEvent?: { eventId?: string | null; title?: string; analysis?: string };
    nonDilutive?: number;
    ecosystemDirection?: string;
    ecosystemAnalysis?: string;
    regClimate?: string;
    regRationale?: string;
    policyRisk?: number;
    policyRationale?: string;
    dependencies?: DependencyIn[];
    enforcementPrecedent?: string | null;
    regimeShift?: { fired?: boolean; rationale?: string };
    watchItem?: { eventId?: string | null; what?: string };
    summary?: string;
  };

  const asDirection = (v: unknown): FlowDirection =>
    v === "tailwind" || v === "headwind" || v === "both"
      ? v
      : "both";

  // Resolve selected ids back to real records so dates + links are sourced.
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
        eventType: o.eventType,
        agency: o.agency,
        deadline: o.deadline ?? o.effectiveDate ?? o.expirationDate,
        url: o.url,
        relevance: clamp(s.relevance),
        whyRelevant: s.whyRelevant?.trim() || s.mechanism?.trim() || "",
        affectedNode: s.affectedNode?.trim() || null,
        mechanism: s.mechanism?.trim() || null,
        direction: s.direction ? asDirection(s.direction) : null,
        position: s.position?.trim() || null,
        entityGate: s.entityGate?.trim() || null,
      };
    })
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));

  const regClimate: RegClimate =
    input.regClimate === "tailwind" || input.regClimate === "headwind"
      ? input.regClimate
      : "neutral";

  // Key dates for referenced events come from the records, never the model.
  const eventDate = (id: string | null | undefined): string | null => {
    if (!id) return null;
    const o = byId.get(id);
    return o ? (o.deadline ?? o.effectiveDate ?? o.expirationDate ?? o.openDate) : null;
  };
  const validEventId = (id: string | null | undefined): string | null =>
    id && byId.has(id) ? id : null;

  const dependencyDetails: DependencyDetail[] = (input.dependencies ?? [])
    .filter((d) => typeof d?.name === "string" && d.name.trim())
    .slice(0, 6)
    .map((d) => {
      const ref = typeof d.eventRef === "string" && d.eventRef.trim() ? d.eventRef.trim() : null;
      return {
        name: d.name.trim(),
        eventRef: ref,
        direction: asDirection(d.direction),
        date: eventDate(ref),
      };
    });

  const definingEvent =
    input.definingEvent?.title && input.definingEvent.analysis
      ? {
          title: input.definingEvent.title.trim(),
          analysis: input.definingEvent.analysis.trim(),
          eventId: validEventId(input.definingEvent.eventId),
        }
      : null;

  const watchItem = input.watchItem?.what
    ? {
        what: input.watchItem.what.trim(),
        eventId: validEventId(input.watchItem.eventId),
        date: eventDate(validEventId(input.watchItem.eventId)),
      }
    : null;

  return {
    nonDilutive: clamp(input.nonDilutive ?? 0),
    regClimate,
    regRationale: input.regRationale?.trim() ?? "",
    policyRisk: clamp(input.policyRisk ?? 0),
    policyRationale: input.policyRationale?.trim() ?? "",
    dependencies: dependencyDetails.map((d) => d.name),
    summary: input.summary?.trim() ?? "",
    opportunities: opportunitiesOut,
    definingEvent,
    ecosystemFunding: input.ecosystemAnalysis?.trim()
      ? {
          direction: asDirection(input.ecosystemDirection),
          analysis: input.ecosystemAnalysis.trim(),
        }
      : null,
    enforcementPrecedent:
      typeof input.enforcementPrecedent === "string" && input.enforcementPrecedent.trim()
        ? input.enforcementPrecedent.trim()
        : null,
    regimeShift: input.regimeShift?.fired
      ? { fired: true, rationale: input.regimeShift.rationale?.trim() ?? "" }
      : null,
    watchItem,
    dependencyDetails,
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
