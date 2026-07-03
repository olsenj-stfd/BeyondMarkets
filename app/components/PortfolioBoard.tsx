"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PortfolioCompany,
  RegClimate,
  ScoredOpportunity,
} from "@/lib/types";

// Noise words that don't help tell two programs apart, so they're dropped
// before comparing titles for fuzzy grouping.
const STOP = new Set([
  "the", "of", "and", "for", "a", "an", "to", "in", "on", "fy", "program",
  "programs", "grant", "grants", "funding", "opportunity", "opportunities",
  "notice", "proposed", "rule", "rules", "act", "federal", "state", "request",
  "proposals", "application", "applications", "department", "office", "fiscal",
  "year", "2024", "2025", "2026", "2027", "2028",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const TITLE_SIM_THRESHOLD = 0.6;

const CLIMATE_LABEL: Record<RegClimate, string> = {
  tailwind: "Tailwind",
  neutral: "Neutral",
  headwind: "Headwind",
};

// Only the meaningful exit events get a badge (private/unknown stay quiet).
const EXIT_LABEL: Record<string, string> = {
  ipo: "IPO",
  acquired: "Acquired",
  shutdown: "Shut down",
};

type Band = "High" | "Medium" | "Low";

// Repeal-prone flagship programs: a single dependency on one of these is enough
// to flag high policy dependency (they swing with each administration / budget).
const FLAGSHIP_DEPENDENCY =
  /45x|45v|45q|45y|48e|\bitc\b|\bptc\b|lcfs|\bira\b|inflation reduction|340b|medicaid|medicare/i;

/**
 * Policy dependency — a descriptive read (not a judgment: a VC may knowingly
 * hold subsidy-dependent positions) grounded in the specific programs the
 * research named:
 *   High   = depends on a flagship repeal-prone program, or on 2+ programs
 *   Medium = depends on exactly one (non-flagship) program
 *   Low    = no specific policy dependency identified
 */
function dependencyBand(dependencies: string[]): Band {
  const deps = dependencies.filter((d) => d && d.trim());
  if (deps.length === 0) return "Low";
  if (deps.length >= 2 || deps.some((d) => FLAGSHIP_DEPENDENCY.test(d))) {
    return "High";
  }
  return "Medium";
}

/**
 * Non-dilutive reach — a transparent, deterministic read of how much grant
 * capital is actually within reach, from the real matched grant programs:
 *   High   = 3+ strongly-matched grants (relevance ≥ 60)
 *   Medium = 1-2 strong grants, or 2+ matched grants overall
 *   Low    = otherwise
 */
function reachBand(opps: ScoredOpportunity[]): Band {
  const grants = opps.filter((o) => o.type === "grant_deadline");
  const strong = grants.filter((o) => o.relevance >= 60);
  if (strong.length >= 3) return "High";
  if (strong.length >= 1 || grants.length >= 2) return "Medium";
  return "Low";
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString();
}

export default function PortfolioBoard({
  portfolioId,
  name,
  initialCompanies,
}: {
  portfolioId: string;
  name: string;
  initialCompanies: PortfolioCompany[];
}) {
  const [companies, setCompanies] = useState<PortfolioCompany[]>(initialCompanies);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const ranOnce = useRef(false);

  const scoreOne = useCallback(
    async (companyId: string): Promise<PortfolioCompany | null> => {
      setScoringId(companyId);
      try {
        const res = await fetch(`/api/portfolios/${portfolioId}/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.company) {
          setErrors((e) => ({
            ...e,
            [companyId]: data.error ?? "Could not score this company.",
          }));
          return null;
        }
        setErrors((e) => {
          const { [companyId]: _drop, ...rest } = e;
          return rest;
        });
        const updated = data.company as PortfolioCompany;
        setCompanies((cs) => cs.map((c) => (c.id === companyId ? updated : c)));
        return updated;
      } catch {
        setErrors((e) => ({ ...e, [companyId]: "Network error." }));
        return null;
      } finally {
        setScoringId(null);
      }
    },
    [portfolioId],
  );

  // Score any unscored companies sequentially (keeps each request small).
  const runQueue = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        await scoreOne(id);
      }
    },
    [scoreOne],
  );

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const unscored = initialCompanies.filter((c) => !c.score).map((c) => c.id);
    if (unscored.length > 0) void runQueue(unscored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rescoreAll() {
    void runQueue(companies.map((c) => c.id));
  }

  const scored = companies.filter((c) => c.score);
  const isBusy = scoringId !== null;

  // ── Rollup ────────────────────────────────────────────────────────────
  const highReach = scored.filter(
    (c) => reachBand(c.score?.opportunities ?? []) === "High",
  );
  const climateCounts = scored.reduce(
    (acc, c) => {
      const k = c.score?.regClimate ?? "neutral";
      acc[k] += 1;
      return acc;
    },
    { tailwind: 0, neutral: 0, headwind: 0 } as Record<RegClimate, number>,
  );
  const highDependency = scored.filter(
    (c) => dependencyBand(c.score?.dependencies ?? []) === "High",
  );

  // Cross-portfolio "act this quarter": real dated items due 30–100 days out
  // (nothing sooner — too late to mount an application — and nothing further
  // than ~a quarter away), with the SAME program rolled up into one action
  // listing every affected company (so a shared grant deadline appears once,
  // not per portco).
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 30);
  const earliestIso = earliest.toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 100);
  const horizonIso = horizon.toISOString().slice(0, 10);
  // Fuzzy-cluster the same program across companies: merge on identical id or
  // URL, or on a matching deadline + similar title (so duplicate records of one
  // program from different sources collapse into a single action).
  type Cluster = {
    opp: ScoredOpportunity;
    companies: string[];
    tokens: Set<string>;
  };
  const clusters: Cluster[] = [];
  for (const c of scored) {
    for (const o of c.score?.opportunities ?? []) {
      if (!o.deadline || o.deadline < earliestIso || o.deadline > horizonIso) continue;
      const tokens = titleTokens(o.title);
      const match = clusters.find(
        (cl) =>
          cl.opp.id === o.id ||
          (!!o.url && cl.opp.url === o.url) ||
          (cl.opp.deadline === o.deadline &&
            jaccard(cl.tokens, tokens) >= TITLE_SIM_THRESHOLD),
      );
      if (match) {
        if (!match.companies.includes(c.name)) match.companies.push(c.name);
        // Keep the representative with the most evidence (highest relevance).
        if (o.relevance > match.opp.relevance) match.opp = o;
      } else {
        clusters.push({ opp: o, companies: [c.name], tokens });
      }
    }
  }
  const actions = clusters
    .sort((a, b) => (a.opp.deadline! < b.opp.deadline! ? -1 : 1))
    .slice(0, 12);

  return (
    <>
      <section className="glass-card intro-card">
        <span className="project-date">Portfolio</span>
        <h2 className="section-title">{name}</h2>
        <p className="intro-text">
          {scored.length} of {companies.length} companies scored
          {isBusy ? " · scoring…" : ""}. Non-dilutive and action items are real,
          dated programs; regulatory climate and policy dependency come from
          the research — open a company&apos;s program analysis for the
          reasoning.
        </p>
        <button
          type="button"
          className="pill-btn ghost"
          onClick={rescoreAll}
          disabled={isBusy}
        >
          {isBusy ? "Scoring…" : "Re-score all ↺"}
        </button>
      </section>

      <details className="glass-card methodology">
        <summary>How to read these scores</summary>
        <div className="methodology-body">
          <p>
            <strong>Non-dilutive reach</strong> — how much grant capital is
            actually within reach, computed from the real matched grant programs
            (no black box):
          </p>
          <ul>
            <li>
              <b>High</b> — 3+ strongly-matched grants (relevance ≥ 60)
            </li>
            <li>
              <b>Medium</b> — 1–2 strong grants, or 2+ matched grants overall
            </li>
            <li>
              <b>Low</b> — no well-matched grant programs currently open
            </li>
          </ul>
          <p>
            <strong>Policy dependency</strong> — how much the company&apos;s
            thesis relies on specific subsidies or policies, from the programs
            the research names. This is descriptive, not a verdict — many strong
            theses are deliberately policy-driven; the point is to know which
            programs to watch:
          </p>
          <ul>
            <li>
              <b>High</b> — depends on a repeal-prone flagship program (e.g. 45X,
              45V, ITC, LCFS, Medicaid) or on 2+ programs
            </li>
            <li>
              <b>Medium</b> — depends on exactly one non-flagship program
            </li>
            <li>
              <b>Low</b> — no specific policy dependency identified
            </li>
          </ul>
          <p>
            <strong>Regulatory climate</strong> — the direction of regulatory
            momentum for the company&apos;s sector (a model assessment):
          </p>
          <ul>
            <li>
              <b>Tailwind</b> — rules, standards, or mandates are creating demand
              or funding for what they do.
            </li>
            <li>
              <b>Neutral</b> — no strong regulatory push either way.
            </li>
            <li>
              <b>Headwind</b> — rollbacks, permitting friction, or enforcement
              risk are working against them.
            </li>
          </ul>
          <p className="muted">
            Grant programs and deadlines are real, dated records from official
            sources. The named dependencies and regulatory climate come from
            Claude&apos;s research — open a company&apos;s program analysis to
            see the reasoning and sources.
          </p>
        </div>
      </details>

      {scored.length > 0 && (
        <section className="rollup">
          <div className="glass-card stat">
            <span className="stat-label">High non-dilutive reach</span>
            <span className="stat-value">{highReach.length}</span>
            <span className="stat-sub">
              {highReach.length === 1 ? "company" : "companies"} with strong grant
              fit
            </span>
          </div>
          <div className="glass-card stat">
            <span className="stat-label">Regulatory climate</span>
            <div className="climate-breakdown">
              <span className="climate-row">
                <i className="dot dot-tailwind" />
                <b>{climateCounts.tailwind}</b> tailwind
              </span>
              <span className="climate-row">
                <i className="dot dot-neutral" />
                <b>{climateCounts.neutral}</b> neutral
              </span>
              <span className="climate-row">
                <i className="dot dot-headwind" />
                <b>{climateCounts.headwind}</b> headwind
              </span>
            </div>
          </div>
          <div className="glass-card stat">
            <span className="stat-label">Policy dependency</span>
            <span className="stat-value">{highDependency.length}</span>
            <span className="stat-sub">
              {highDependency.length === 1 ? "company" : "companies"} with a
              subsidy-dependent thesis
            </span>
          </div>
        </section>
      )}

      {actions.length > 0 && (
        <section className="glass-card act-quarter">
          <h3 className="section-title">Act this quarter</h3>
          <p className="muted">
            Real deadlines across the book, due 30–100 days out — far enough to
            mount an application, close enough to act now.
          </p>
          <ul className="act-list">
            {actions.map(({ opp, companies: affected }) => (
              <li key={opp.id} className="act-item">
                <span className="act-deadline">{fmtDate(opp.deadline)}</span>
                <span className="act-body">
                  <a href={opp.url} target="_blank" rel="noopener noreferrer">
                    {opp.title}
                  </a>
                  <span className="act-meta">
                    {opp.agency ? `${opp.agency} · ` : ""}
                    {opp.type === "grant_deadline" ? "Grant" : "Comment period"}
                    {` · ${affected.length} ${
                      affected.length === 1 ? "company" : "companies"
                    }`}
                  </span>
                  <span className="act-companies">{affected.join(", ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="company-cards">
        {companies.map((c) => {
          const s = c.score;
          const err = errors[c.id];
          const isScoring = scoringId === c.id;
          const open = expanded[c.id];
          return (
            <article className="glass-card company-card" key={c.id}>
              <div className="company-head">
                <div>
                  <h3>{c.name}</h3>
                  <div className="badges">
                    {c.sector && <span className="badge">{c.sector}</span>}
                    {c.stage && <span className="badge">{c.stage}</span>}
                    {c.geography && <span className="badge">{c.geography}</span>}
                    {c.profileSource === "web" && c.description && (
                      <span className="badge">web-profiled</span>
                    )}
                    {c.website && (
                      <a
                        className="badge badge-link"
                        href={
                          /^https?:\/\//.test(c.website)
                            ? c.website
                            : `https://${c.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        site ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="company-head-badges">
                  {c.exitType && EXIT_LABEL[c.exitType] && (
                    <span
                      className={`badge badge-exit badge-exit-${c.exitType}`}
                      title={c.exitNote ?? undefined}
                    >
                      {EXIT_LABEL[c.exitType]}
                    </span>
                  )}
                  {s && (
                    <span className={`badge badge-${s.regClimate}`}>
                      {CLIMATE_LABEL[s.regClimate]}
                    </span>
                  )}
                </div>
              </div>

              {c.exitType && EXIT_LABEL[c.exitType] && c.exitNote && (
                <p className="exit-note">{c.exitNote}</p>
              )}

              {c.description && <p className="muted company-desc">{c.description}</p>}

              {isScoring ? (
                <p className="empty">
                  {!c.description ? "Researching & scoring…" : "Scoring…"}
                </p>
              ) : err ? (
                <div className="error">
                  {err}{" "}
                  <button
                    type="button"
                    className="link-btn inline"
                    onClick={() => scoreOne(c.id)}
                  >
                    Retry
                  </button>
                </div>
              ) : s ? (
                <>
                  {s.summary && <p className="why">{s.summary}</p>}

                  <div className="score-row">
                    <div className="score-metric">
                      <span
                        className={`score-band band-${reachBand(
                          s.opportunities,
                        ).toLowerCase()}`}
                      >
                        {reachBand(s.opportunities)}
                      </span>
                      <span className="score-cap">Non-dilutive reach</span>
                    </div>
                    <div className="score-metric">
                      <span
                        className={`score-band risk-${dependencyBand(
                          s.dependencies,
                        ).toLowerCase()}`}
                      >
                        {dependencyBand(s.dependencies)}
                      </span>
                      <span className="score-cap">Policy dependency</span>
                    </div>
                    <div className="score-metric">
                      <span className="score-num">
                        {
                          s.opportunities.filter(
                            (o) => o.type === "grant_deadline",
                          ).length
                        }
                      </span>
                      <span className="score-cap">Open grants</span>
                    </div>
                    <div className="score-metric">
                      <span className="score-num">
                        {
                          s.opportunities.filter(
                            (o) => o.type === "comment_period",
                          ).length
                        }
                      </span>
                      <span className="score-cap">Open rulemakings</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))
                    }
                  >
                    {open ? "Program analysis ▲" : "Program analysis ▼"}
                  </button>

                  {open && (
                    <div className="company-evidence">
                      {c.graph && (
                        <details className="graph-block">
                          <summary className="muted">
                            Regulatory profile (drafted by Claude — the lens
                            used for matching)
                          </summary>
                          <div className="graph-lines">
                            {c.graph.businessModel && (
                              <p className="evidence-line">
                                <strong>Model:</strong> {c.graph.businessModel}
                                {c.graph.sectors.length > 0 &&
                                  ` · ${c.graph.sectors.join(", ")}`}
                              </p>
                            )}
                            {c.graph.valueChain.customers.length > 0 && (
                              <p className="evidence-line">
                                <strong>Customers:</strong>{" "}
                                {c.graph.valueChain.customers.join(", ")}
                              </p>
                            )}
                            {c.graph.valueChain.partners.length > 0 && (
                              <p className="evidence-line">
                                <strong>Partners:</strong>{" "}
                                {c.graph.valueChain.partners.join(", ")}
                              </p>
                            )}
                            {c.graph.valueChain.substitutes.length > 0 && (
                              <p className="evidence-line">
                                <strong>Substitutes:</strong>{" "}
                                {c.graph.valueChain.substitutes.join(", ")}
                              </p>
                            )}
                            {c.graph.valueChain.payersUpstream.length > 0 && (
                              <p className="evidence-line">
                                <strong>Upstream payers:</strong>{" "}
                                {c.graph.valueChain.payersUpstream.join(", ")}
                              </p>
                            )}
                            {(c.graph.regulatoryRegimes.federal.length > 0 ||
                              c.graph.regulatoryRegimes.state.length > 0) && (
                              <p className="evidence-line">
                                <strong>Regimes:</strong>{" "}
                                {[
                                  ...c.graph.regulatoryRegimes.federal,
                                  ...c.graph.regulatoryRegimes.state,
                                ].join(", ")}
                              </p>
                            )}
                            {c.graph.regulatoryRegimes.agencies.length > 0 && (
                              <p className="evidence-line">
                                <strong>Regulators:</strong>{" "}
                                {c.graph.regulatoryRegimes.agencies.join(", ")}
                              </p>
                            )}
                            {c.graph.operatingStates.length > 0 && (
                              <p className="evidence-line">
                                <strong>States:</strong>{" "}
                                {c.graph.operatingStates.join(", ")}
                              </p>
                            )}
                          </div>
                        </details>
                      )}
                      {s.regRationale && (
                        <p className="evidence-line">
                          <strong>Regulatory climate:</strong> {s.regRationale}
                        </p>
                      )}
                      {s.policyRationale && (
                        <p className="evidence-line">
                          <strong>Policy dependency:</strong> {s.policyRationale}
                        </p>
                      )}
                      {s.dependencies.length > 0 && (
                        <p className="evidence-line">
                          <strong>Dependencies:</strong>{" "}
                          {s.dependencies.join(", ")}
                        </p>
                      )}
                      {(["grant_deadline", "comment_period"] as const).map(
                        (kind) => {
                          const items = s.opportunities.filter(
                            (o) => o.type === kind,
                          );
                          if (items.length === 0) return null;
                          return (
                            <div key={kind}>
                              <p className="evidence-line">
                                <strong>
                                  {kind === "grant_deadline"
                                    ? "Open grants"
                                    : "Rulemakings open for comment"}
                                </strong>
                              </p>
                              <ul className="evidence-opps">
                                {items.map((o) => (
                                  <li key={o.id}>
                                    <a
                                      href={o.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {o.title}
                                    </a>
                                    <span className="act-meta">
                                      {fmtDate(o.deadline)
                                        ? `Due ${fmtDate(o.deadline)}`
                                        : ""}
                                      {o.agency ? ` · ${o.agency}` : ""}
                                    </span>
                                    <span className="evidence-why">
                                      {o.whyRelevant}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        },
                      )}
                      {s.opportunities.length === 0 && (
                        <p className="muted">
                          No currently-open grants or comment periods in our
                          federal + California feeds matched this company. That
                          reflects what&apos;s open right now in the sources we
                          track (Grants.gov, CA Grants Portal, Federal Register,
                          Regulations.gov) — not necessarily that no programs
                          exist. New opportunities are ingested daily; re-score
                          to refresh.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="empty">Queued for scoring…</p>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
