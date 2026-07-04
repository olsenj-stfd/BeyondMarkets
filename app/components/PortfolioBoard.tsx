"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { csvToCompanies, namesToCompanies } from "@/lib/company-input";
import { dependencyBand, reachBand } from "@/lib/bands";
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

// High/Medium/Low band logic lives in lib/bands.ts, shared with the emailed
// portfolio report.

const DIRECTION_ICON: Record<string, string> = {
  tailwind: "↑ tailwind",
  headwind: "↓ headwind",
  both: "↕ cuts both ways",
};

/** Group evidence into the insight-card sections by event type. */
function evidenceGroup(o: ScoredOpportunity): "grants" | "rulemakings" | "enforcement" | "signals" {
  const et = o.eventType;
  if (
    o.type === "grant_deadline" ||
    et === "grant_open" ||
    et === "grant_forecasted" ||
    et === "grant_recurring" ||
    et === "foundation_grant" ||
    et === "appropriations_event"
  ) {
    return "grants";
  }
  if (et === "enforcement_action") return "enforcement";
  if (
    o.type === "comment_period" ||
    et === "nprm_open_comment" ||
    et === "rule_final_pending_effective" ||
    et === "rule_effective_recent" ||
    et === "rule_temporary_expiring" ||
    et === "guidance_document" ||
    et === "negotiated_rulemaking" ||
    et === "unified_agenda_planned" ||
    et === "state_implementation_window" ||
    et === "bill_introduced" ||
    et === "bill_committee_passed" ||
    et === "bill_chamber_passed" ||
    et === "law_enacted_implementing"
  ) {
    return "rulemakings";
  }
  return "signals";
}

const GROUP_LABEL: Record<ReturnType<typeof evidenceGroup>, string> = {
  grants: "Funding flows",
  rulemakings: "Rulemakings, bills & implementation windows",
  enforcement: "Enforcement precedent",
  signals: "Market & analyst signals",
};

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
  const [sortBy, setSortBy] = useState<"alpha" | "deadline">("alpha");
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"names" | "csv">("names");
  const [addText, setAddText] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [reportState, setReportState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent"; to: string } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [shareState, setShareState] = useState<
    | { kind: "idle" }
    | { kind: "creating" }
    | { kind: "ready"; url: string; copied: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const ranOnce = useRef(false);

  const scoreOne = useCallback(
    async (companyId: string): Promise<PortfolioCompany | null> => {
      setScoringId(companyId);
      try {
        // Phase 1: enrich + graph (own function window; fast no-op when the
        // profile already exists). Phase 2: the synthesis call.
        for (const phase of ["prepare", "score"] as const) {
          const res = await fetch(`/api/portfolios/${portfolioId}/${phase}`, {
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
          const updated = data.company as PortfolioCompany;
          setCompanies((cs) =>
            cs.map((c) => (c.id === companyId ? updated : c)),
          );
          if (phase === "score") {
            setErrors((e) => {
              const { [companyId]: _drop, ...rest } = e;
              return rest;
            });
            return updated;
          }
        }
        return null;
      } catch {
        setErrors((e) => ({ ...e, [companyId]: "Network error." }));
        return null;
      } finally {
        setScoringId(null);
      }
    },
    [portfolioId],
  );

  // Single serialized scoring queue: each score rewrites the whole companies
  // array server-side, so two in-flight scores would clobber each other.
  // Everything (initial run, re-score all, per-company re-runs, newly added
  // companies) funnels through here.
  const pendingRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const enqueue = useCallback(
    (ids: string[]) => {
      const fresh = ids.filter((id) => !pendingRef.current.includes(id));
      pendingRef.current.push(...fresh);
      if (processingRef.current) return;
      processingRef.current = true;
      void (async () => {
        try {
          while (pendingRef.current.length > 0) {
            const next = pendingRef.current.shift()!;
            await scoreOne(next);
          }
        } finally {
          processingRef.current = false;
        }
      })();
    },
    [scoreOne],
  );

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const unscored = initialCompanies.filter((c) => !c.score).map((c) => c.id);
    if (unscored.length > 0) enqueue(unscored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rescoreAll() {
    enqueue(companies.map((c) => c.id));
  }

  async function shareReport() {
    setShareState({ kind: "creating" });
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/share`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setShareState({
          kind: "error",
          message: data.error ?? "Could not create the share link.",
        });
        return;
      }
      let copied = false;
      try {
        await navigator.clipboard.writeText(data.url);
        copied = true;
      } catch {
        // Clipboard can be blocked; the link is shown either way.
      }
      setShareState({ kind: "ready", url: data.url, copied });
    } catch {
      setShareState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  async function emailReport() {
    setReportState({ kind: "sending" });
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/report`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReportState({
          kind: "error",
          message: data.error ?? "Could not send the report. Please try again.",
        });
        return;
      }
      setReportState({ kind: "sent", to: data.sentTo ?? "your email" });
    } catch {
      setReportState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  // ── Add companies to an already-created (possibly scored) portfolio ──
  const addParsed =
    addMode === "names" ? namesToCompanies(addText) : csvToCompanies(addText);

  async function addCompanies(e: React.FormEvent) {
    e.preventDefault();
    if (addParsed.length === 0) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companies: addParsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.companies) {
        setAddError(data.error ?? "Could not add the companies. Please try again.");
        return;
      }
      setCompanies(data.companies as PortfolioCompany[]);
      setAddText("");
      setAddOpen(false);
      enqueue((data.addedIds as string[]) ?? []);
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
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

  // ── Card ordering: alphabetical, or soonest upcoming deadline first ──
  const today = new Date().toISOString().slice(0, 10);
  const soonestDeadline = (c: PortfolioCompany): string => {
    const dates = (c.score?.opportunities ?? [])
      .map((o) => o.deadline)
      .filter((d): d is string => !!d && d >= today)
      .sort();
    return dates[0] ?? "9999";
  };
  const displayCompanies = [...companies].sort((a, b) =>
    sortBy === "alpha"
      ? a.name.localeCompare(b.name)
      : soonestDeadline(a).localeCompare(soonestDeadline(b)) ||
        a.name.localeCompare(b.name),
  );

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
        <div className="board-actions">
          <button
            type="button"
            className="pill-btn ghost"
            onClick={rescoreAll}
            disabled={isBusy}
          >
            {isBusy ? "Scoring…" : "Re-score all ↺"}
          </button>
          <button
            type="button"
            className="pill-btn ghost"
            onClick={() => setAddOpen((o) => !o)}
          >
            {addOpen ? "Close" : "+ Add companies"}
          </button>
          <button
            type="button"
            className="pill-btn ghost"
            onClick={emailReport}
            disabled={reportState.kind === "sending" || scored.length === 0}
            title="Email a rolled-up report of this portfolio to your sign-in address"
          >
            {reportState.kind === "sending" ? "Sending…" : "Email me this report"}
          </button>
          <button
            type="button"
            className="pill-btn ghost"
            onClick={shareReport}
            disabled={shareState.kind === "creating" || scored.length === 0}
            title="Create a public snapshot link of this report (also printable to PDF)"
          >
            {shareState.kind === "creating" ? "Creating link…" : "Share report ↗"}
          </button>
        </div>
        {reportState.kind === "sent" && (
          <p className="muted report-status">Report sent to {reportState.to}.</p>
        )}
        {reportState.kind === "error" && (
          <div className="error report-status">{reportState.message}</div>
        )}
        {shareState.kind === "ready" && (
          <p className="muted report-status">
            {shareState.copied ? "Link copied to clipboard: " : "Share link: "}
            <a href={shareState.url} target="_blank" rel="noopener noreferrer">
              {shareState.url}
            </a>{" "}
            — a frozen snapshot of this report; anyone with the link can view
            or save it as a PDF.
          </p>
        )}
        {shareState.kind === "error" && (
          <div className="error report-status">{shareState.message}</div>
        )}
      </section>

      {addOpen && (
        <section className="glass-card add-companies">
          <form onSubmit={addCompanies} className="portfolio-form">
            <div className="mode-tabs">
              <button
                type="button"
                className={`mode-tab ${addMode === "names" ? "active" : ""}`}
                onClick={() => setAddMode("names")}
              >
                By name (web research)
              </button>
              <button
                type="button"
                className={`mode-tab ${addMode === "csv" ? "active" : ""}`}
                onClick={() => setAddMode("csv")}
              >
                Paste CSV
              </button>
            </div>
            <label className="field">
              <span>
                {addMode === "names"
                  ? "Company names — one per line (optionally “Name, website”)"
                  : "Paste CSV — columns: name, description, sector, stage, geography, website (header row optional)"}
              </span>
              <textarea
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                placeholder={
                  addMode === "names"
                    ? "Heirloom Carbon\nForm Energy, formenergy.com"
                    : "name,description,sector,stage,geography\nHeirloom,Direct air capture using limestone,Carbon removal,Series B,California"
                }
                rows={4}
              />
            </label>
            <div className="portfolio-form-actions">
              <span className="muted">
                {addParsed.length}{" "}
                {addParsed.length === 1 ? "company" : "companies"} detected —
                they&apos;ll be researched &amp; scored after the current queue
              </span>
              <button
                type="submit"
                className="pill-btn"
                disabled={addLoading || addParsed.length === 0}
              >
                {addLoading && <span className="spinner" />}
                Add &amp; score
              </button>
            </div>
            {addError && <div className="error">{addError}</div>}
          </form>
        </section>
      )}

      <details className="glass-card methodology">
        <summary>How to read these scores</summary>
        <div className="methodology-body">
          <p>
            <strong>Direct grant reach</strong> — how much grant capital this
            company could win itself, computed from the real matched grant
            programs (no black box). Grants gated by entity type (e.g.
            nonprofit-only) don&apos;t count here — they show under ecosystem
            funding instead:
          </p>
          <ul>
            <li>
              <b>High</b> — 3+ strongly-matched eligible grants (relevance ≥ 60)
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
          <p>
            <strong>Defining event &amp; watch item</strong> — the one
            development that most reshapes the company&apos;s market (pending-
            effective final rules and enacted laws count, not just open
            dockets), and the single highest-signal upcoming date to monitor.
            Both cite tracked records; when something isn&apos;t in the feeds
            yet it&apos;s labeled as a coverage gap.
          </p>
          <p>
            <strong>Ecosystem funding</strong> — money flowing to the
            company&apos;s customers, partners, or substitutes, with direction:
            a subsidy to a substitute can be a headwind and a product opening
            at once.
          </p>
          <p className="muted">
            Events, dates, and links are real records from tracked sources
            (Grants.gov, Federal Register, Regulations.gov, Congress.gov, CA
            Grants Portal, agency newsrooms, state regulators). The analysis
            connecting them to this company comes from Claude&apos;s research —
            open a company&apos;s program analysis to see the affected node and
            mechanism behind every item. Enforcement precedent is cited only
            from tracked enforcement records, never from model memory.
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

      <div className="company-sort">
        <span className="muted">Sort</span>
        <button
          type="button"
          className={`mode-tab ${sortBy === "alpha" ? "active" : ""}`}
          onClick={() => setSortBy("alpha")}
        >
          A–Z
        </button>
        <button
          type="button"
          className={`mode-tab ${sortBy === "deadline" ? "active" : ""}`}
          onClick={() => setSortBy("deadline")}
        >
          Upcoming deadlines
        </button>
      </div>

      <section className="company-cards">
        {displayCompanies.map((c) => {
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
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => enqueue([c.id])}
                    disabled={isScoring}
                    title="Re-run the research and scoring for this company"
                  >
                    {isScoring ? "Running…" : "Re-run ↺"}
                  </button>
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
                    onClick={() => enqueue([c.id])}
                  >
                    Retry
                  </button>
                </div>
              ) : s ? (
                <>
                  {s.summary && <p className="why">{s.summary}</p>}

                  {s.definingEvent && (
                    <div className="defining-event">
                      <span className="defining-label">Defining event</span>
                      <p className="defining-title">
                        {s.definingEvent.eventId &&
                        s.opportunities.find(
                          (o) => o.id === s.definingEvent!.eventId,
                        ) ? (
                          <a
                            href={
                              s.opportunities.find(
                                (o) => o.id === s.definingEvent!.eventId,
                              )!.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {s.definingEvent.title} ↗
                          </a>
                        ) : (
                          s.definingEvent.title
                        )}
                      </p>
                      <p className="defining-analysis">
                        {s.definingEvent.analysis}
                        {!s.definingEvent.eventId && (
                          <span className="muted">
                            {" "}
                            (Not yet in the tracked feeds — flagged from
                            analysis, verify at the source.)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {s.watchItem && (
                    <p className="watch-item">
                      <strong>Watch:</strong> {s.watchItem.what}
                      {s.watchItem.date && ` — ${fmtDate(s.watchItem.date)}`}
                    </p>
                  )}

                  {s.regimeShift?.fired && (
                    <p className="regime-shift">
                      <strong>Regime shift:</strong> {s.regimeShift.rationale}
                    </p>
                  )}

                  <div className="score-row">
                    <div className="score-metric">
                      <span
                        className={`score-band band-${reachBand(
                          s.opportunities,
                        ).toLowerCase()}`}
                      >
                        {reachBand(s.opportunities)}
                      </span>
                      <span className="score-cap">Direct grant reach</span>
                    </div>
                    {s.ecosystemFunding && (
                      <div className="score-metric">
                        <span className="score-band">
                          {DIRECTION_ICON[s.ecosystemFunding.direction]}
                        </span>
                        <span className="score-cap">Ecosystem funding</span>
                      </div>
                    )}
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
                            (o) => evidenceGroup(o) === "grants",
                          ).length
                        }
                      </span>
                      <span className="score-cap">Funding items</span>
                    </div>
                    <div className="score-metric">
                      <span className="score-num">
                        {
                          s.opportunities.filter(
                            (o) => evidenceGroup(o) === "rulemakings",
                          ).length
                        }
                      </span>
                      <span className="score-cap">Rules &amp; bills</span>
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
                            Regulatory Profile (automatically generated)
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
                      {s.ecosystemFunding && (
                        <p className="evidence-line">
                          <strong>Ecosystem funding:</strong>{" "}
                          {s.ecosystemFunding.analysis}
                        </p>
                      )}
                      {s.policyRationale && (
                        <p className="evidence-line">
                          <strong>Policy dependency:</strong> {s.policyRationale}
                        </p>
                      )}
                      {(s.dependencyDetails?.length ?? 0) > 0 ? (
                        <p className="evidence-line">
                          <strong>Dependencies:</strong>{" "}
                          {s.dependencyDetails!
                            .map(
                              (d) =>
                                `${d.name} (${d.direction}${
                                  d.date ? `, ${fmtDate(d.date)}` : ""
                                })`,
                            )
                            .join(" · ")}
                        </p>
                      ) : (
                        s.dependencies.length > 0 && (
                          <p className="evidence-line">
                            <strong>Dependencies:</strong>{" "}
                            {s.dependencies.join(", ")}
                          </p>
                        )
                      )}
                      {(
                        ["grants", "rulemakings", "enforcement", "signals"] as const
                      ).map((group) => {
                        const items = s.opportunities.filter(
                          (o) => evidenceGroup(o) === group,
                        );
                        if (items.length === 0) return null;
                        return (
                          <div key={group}>
                            <p className="evidence-line">
                              <strong>{GROUP_LABEL[group]}</strong>
                            </p>
                            {group === "enforcement" &&
                              s.enforcementPrecedent && (
                                <p className="evidence-line">
                                  {s.enforcementPrecedent}
                                </p>
                              )}
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
                                      ? `Key date ${fmtDate(o.deadline)}`
                                      : ""}
                                    {o.agency ? ` · ${o.agency}` : ""}
                                    {o.direction
                                      ? ` · ${DIRECTION_ICON[o.direction]}`
                                      : ""}
                                  </span>
                                  {o.entityGate && (
                                    <span className="entity-gate">
                                      Eligibility gate: {o.entityGate}
                                    </span>
                                  )}
                                  <span className="evidence-why">
                                    {o.mechanism ?? o.whyRelevant}
                                  </span>
                                  {o.position && (
                                    <span className="evidence-why">
                                      <em>Position to take:</em> {o.position}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                      {s.opportunities.length === 0 && (
                        <p className="muted">
                          Nothing in the tracked feeds matched this company
                          right now — grants, pending rules, bills, or
                          enforcement. That reflects current feed coverage
                          (Grants.gov, CA Grants Portal, Federal Register,
                          Regulations.gov, Congress.gov, agency newsrooms), not
                          necessarily the company. Feeds ingest daily; re-score
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
