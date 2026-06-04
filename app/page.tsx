"use client";

import { useRef, useState } from "react";
import type { EnrichedMatch, FollowUp, RecordType } from "@/lib/types";

const EXAMPLES = [
  "We build hydrogen fuel-cell powertrains for heavy-duty trucks, manufacturing pilot units in the Bay Area.",
  "We're a carbon-accounting SaaS helping mid-size manufacturers measure and report Scope 1-3 emissions.",
  "We develop a catalytic process that captures NOx from industrial exhaust, with a pilot line in the Central Valley.",
  "We make compostable packaging from agricultural waste, sold to California food brands.",
];

const COLUMNS: { type: RecordType; label: string; blurb: string }[] = [
  { type: "regulation", label: "Regulations", blurb: "Rules you may need to comply with" },
  { type: "grant", label: "Grant Opportunities", blurb: "Grants, rebates, loans & tax credits" },
  { type: "partner", label: "Potential Partners", blurb: "Ecosystem & capital partners" },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [followUpsOpen, setFollowUpsOpen] = useState(false);
  const [refinements, setRefinements] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  async function runMatch(fullText: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: fullText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.detail
            ? `${data.error} [${data.status ?? "?"}] ${data.detail}`
            : data.error ?? "Request failed.",
        );
        return false;
      }
      setMatches(data.matches);
      setFollowUps(data.followUps ?? []);
      setSelections({});
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setMatches(null);
    setRefinements([]);
    const ok = await runMatch(description);
    if (ok) setFollowUpsOpen(true);
  }

  async function refine() {
    const newLines = followUps
      .map((f, i) => (selections[i] ? `- ${f.question} → ${selections[i]}` : null))
      .filter((x): x is string => x !== null);
    if (newLines.length === 0) return;

    const allRefinements = [...refinements, ...newLines];
    setRefinements(allRefinements);
    const fullText = `${description.trim()}\n\nAdditional context:\n${allRefinements.join("\n")}`;
    const ok = await runMatch(fullText);
    if (ok) {
      setFollowUpsOpen(false); // refine once; require explicit opt-in to go again
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const hasSelection = Object.keys(selections).length > 0;

  return (
    <main className="page">
      <header className="header">
        <div className="brand">
          <div className="logo-mark" />
          <div>
            <h1>RegScout</h1>
            <p className="tagline">Regulatory · Grants · Partners</p>
          </div>
        </div>
        <span className="scope-pill">Federal + California</span>
      </header>

      <section className="glass-card intro-card">
        <p className="intro-text">
          Describe what your venture does. We&apos;ll surface the regulations you
          may face, the grants you could pursue, and the partners worth knowing.
        </p>
        <form onSubmit={analyze}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We build zero-emission refrigerated trailers for regional grocery fleets, assembled in California…"
          />
          <div className="row">
            <div className="examples">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  className="chip"
                  onClick={() => setDescription(ex)}
                >
                  Example {i + 1}
                </button>
              ))}
            </div>
            <button
              className="pill-btn"
              type="submit"
              disabled={loading || description.trim().length < 20}
            >
              {loading && <span className="spinner" />}
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </form>
      </section>

      {error && <div className="error">{error}</div>}

      {matches && !followUpsOpen && followUps.length > 0 && (
        <div className="refine-further">
          <button type="button" className="pill-btn ghost" onClick={() => setFollowUpsOpen(true)}>
            Refine further ↺
          </button>
        </div>
      )}

      {followUpsOpen && followUps.length > 0 && (
        <section className="glass-card followups">
          <h2>Refine your results</h2>
          <p className="followups-sub">
            Pick the answers that fit, then refine. (You can refine again afterward.)
          </p>
          {followUps.map((f, qi) => (
            <div className="followup" key={qi}>
              <span className="followup-q">{f.question}</span>
              <div className="option-row">
                {f.options.map((opt, oi) => (
                  <button
                    key={oi}
                    type="button"
                    className={`option ${selections[qi] === opt ? "selected" : ""}`}
                    onClick={() =>
                      setSelections((s) =>
                        s[qi] === opt
                          ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== String(qi)))
                          : { ...s, [qi]: opt },
                      )
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="pill-btn"
            onClick={refine}
            disabled={loading || !hasSelection}
          >
            {loading ? "Refining…" : "Refine my results"}
          </button>
        </section>
      )}

      {matches && (
        <section className="board" ref={boardRef}>
          {COLUMNS.map((col) => {
            const items = matches.filter((m) => m.record.type === col.type);
            return (
              <div className={`column col-${col.type}`} key={col.type}>
                <div className="column-head">
                  <h2>
                    {col.label} <span className="count">{items.length}</span>
                  </h2>
                  <p>{col.blurb}</p>
                </div>
                {items.length === 0 ? (
                  <p className="empty">No strong matches in this category.</p>
                ) : (
                  items.map((m) => <ResultCard key={m.id} match={m} />)
                )}
              </div>
            );
          })}
        </section>
      )}

      <p className="disclaimer">
        Prototype on a hand-curated federal + California dataset. Summaries and
        timing notes are for orientation only — confirm specifics (especially
        dates, deadlines, and workshop/hearing schedules) against the linked
        official source before making a compliance or funding decision.
      </p>
    </main>
  );
}

function ResultCard({ match }: { match: EnrichedMatch }) {
  const { record: r } = match;
  return (
    <article className="card">
      <div className="card-top">
        <h3>{r.title}</h3>
        <div className="relevance">
          {match.relevance}
          <span>fit</span>
        </div>
      </div>

      <div className="badges">
        <span className="badge">{r.agencyAcronym}</span>
        <span className="badge">{r.level}</span>
        <span className="badge">{r.domain}</span>
      </div>

      <p className="why">{match.whyRelevant}</p>

      {match.keyDates.length > 0 && (
        <div className="key-dates">
          <h4>
            <CalendarIcon /> Key dates &amp; engagement
          </h4>
          <ul>
            {match.keyDates.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {match.checklist.length > 0 && (
        <div className="checklist">
          <h4>Checklist</h4>
          <ul>
            {match.checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="more">
        <summary>More detail</summary>
        <div className="more-body">
          <h5>Summary</h5>
          <p>{r.summary}</p>
          <h5>Applies to</h5>
          <p>{r.applicability}</p>
          <h5>Context</h5>
          <p>{r.context}</p>
          <h5>How to engage with {r.agencyAcronym}</h5>
          <p>{r.howToEngage}</p>
          <p className="juris">{r.jurisdiction}</p>
        </div>
      </details>

      <a href={r.link} target="_blank" rel="noopener noreferrer">
        Official source ↗
      </a>
    </article>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
