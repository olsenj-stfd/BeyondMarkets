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

function riskLabel(n: number): string {
  return n >= 67 ? "High" : n >= 34 ? "Medium" : "Low";
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
  const avgNonDilutive =
    scored.length > 0
      ? Math.round(
          scored.reduce((s, c) => s + (c.score?.nonDilutive ?? 0), 0) /
            scored.length,
        )
      : 0;
  const climateCounts = scored.reduce(
    (acc, c) => {
      const k = c.score?.regClimate ?? "neutral";
      acc[k] += 1;
      return acc;
    },
    { tailwind: 0, neutral: 0, headwind: 0 } as Record<RegClimate, number>,
  );
  const highRisk = scored.filter((c) => (c.score?.policyRisk ?? 0) >= 67);

  // Cross-portfolio "act this quarter": real dated items in the next 90 days,
  // with the SAME program rolled up into one action listing every affected
  // company (so a shared grant deadline appears once, not per portco).
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  const horizonIso = horizon.toISOString().slice(0, 10);
  const todayIso = new Date().toISOString().slice(0, 10);
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
      if (!o.deadline || o.deadline < todayIso || o.deadline > horizonIso) continue;
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
          dated programs; regulatory climate and policy risk are model
          assessments — expand any company to see the evidence.
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

      {scored.length > 0 && (
        <section className="rollup">
          <div className="glass-card stat">
            <span className="stat-label">Avg non-dilutive reach</span>
            <span className="stat-value">{avgNonDilutive}</span>
            <span className="stat-sub">/ 100 across scored companies</span>
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
            <span className="stat-label">High policy risk</span>
            <span className="stat-value">{highRisk.length}</span>
            <span className="stat-sub">
              {highRisk.length === 1 ? "company" : "companies"} subsidy-dependent
            </span>
          </div>
        </section>
      )}

      {actions.length > 0 && (
        <section className="glass-card act-quarter">
          <h3 className="section-title">Act this quarter</h3>
          <p className="muted">Real deadlines in the next 90 days across the book.</p>
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
                {s && (
                  <span className={`badge badge-${s.regClimate}`}>
                    {CLIMATE_LABEL[s.regClimate]}
                  </span>
                )}
              </div>

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
                      <span className="score-num">{s.nonDilutive}</span>
                      <span className="score-cap">Non-dilutive reach</span>
                    </div>
                    <div className="score-metric">
                      <span className="score-num">
                        {s.policyRisk}
                        <small> {riskLabel(s.policyRisk)}</small>
                      </span>
                      <span className="score-cap">Policy risk</span>
                    </div>
                    <div className="score-metric">
                      <span className="score-num">{s.opportunities.length}</span>
                      <span className="score-cap">Programs in reach</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))
                    }
                  >
                    {open ? "Hide evidence ▲" : "Show evidence ▼"}
                  </button>

                  {open && (
                    <div className="company-evidence">
                      {s.regRationale && (
                        <p className="evidence-line">
                          <strong>Regulatory climate:</strong> {s.regRationale}
                        </p>
                      )}
                      {s.policyRationale && (
                        <p className="evidence-line">
                          <strong>Policy risk:</strong> {s.policyRationale}
                        </p>
                      )}
                      {s.dependencies.length > 0 && (
                        <p className="evidence-line">
                          <strong>Dependencies:</strong>{" "}
                          {s.dependencies.join(", ")}
                        </p>
                      )}
                      {s.opportunities.length > 0 ? (
                        <ul className="evidence-opps">
                          {s.opportunities.map((o) => (
                            <li key={o.id}>
                              <a
                                href={o.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {o.title}
                              </a>
                              <span className="act-meta">
                                {o.type === "grant_deadline"
                                  ? "Grant"
                                  : "Comment period"}
                                {fmtDate(o.deadline)
                                  ? ` · due ${fmtDate(o.deadline)}`
                                  : ""}
                                {o.agency ? ` · ${o.agency}` : ""}
                              </span>
                              <span className="evidence-why">{o.whyRelevant}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">
                          No dated programs matched in the current set.
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
