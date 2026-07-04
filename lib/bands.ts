import type { ScoredOpportunity } from "@/lib/types";

/**
 * Deterministic, explainable High/Medium/Low reads shared by the portfolio
 * board and the emailed report — kept out of the LLM so they're transparent.
 */

export type Band = "High" | "Medium" | "Low";

// Repeal-prone flagship programs: a single dependency on one of these is
// enough to flag high policy dependency (they swing with each administration
// / budget).
export const FLAGSHIP_DEPENDENCY =
  /45x|45v|45q|45y|48e|\bitc\b|\bptc\b|lcfs|\bira\b|inflation reduction|340b|medicaid|medicare/i;

/**
 * Policy dependency — a descriptive read (not a judgment: a VC may knowingly
 * hold subsidy-dependent positions) grounded in the specific programs the
 * research named:
 *   High   = depends on a flagship repeal-prone program, or on 2+ programs
 *   Medium = depends on exactly one (non-flagship) program
 *   Low    = no specific policy dependency identified
 */
export function dependencyBand(dependencies: string[]): Band {
  const deps = dependencies.filter((d) => d && d.trim());
  if (deps.length === 0) return "Low";
  if (deps.length >= 2 || deps.some((d) => FLAGSHIP_DEPENDENCY.test(d))) {
    return "High";
  }
  return "Medium";
}

/**
 * Direct grant reach — a transparent, deterministic read of how much grant
 * capital THIS company could win itself, from the real matched grant
 * programs. Entity-gated grants (e.g. nonprofit-only) don't count:
 *   High   = 3+ strongly-matched eligible grants (relevance ≥ 60)
 *   Medium = 1-2 strong eligible grants, or 2+ eligible grants overall
 *   Low    = otherwise
 */
export function reachBand(opps: ScoredOpportunity[]): Band {
  const grants = opps.filter(
    (o) =>
      (o.type === "grant_deadline" ||
        o.eventType === "grant_open" ||
        o.eventType === "grant_forecasted") &&
      !o.entityGate,
  );
  const strong = grants.filter((o) => o.relevance >= 60);
  if (strong.length >= 3) return "High";
  if (strong.length >= 1 || grants.length >= 2) return "Medium";
  return "Low";
}
