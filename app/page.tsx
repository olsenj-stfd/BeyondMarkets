"use client";

import { useRef, useState } from "react";
import type { EnrichedMatch, RecordType } from "@/lib/types";

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
  const [followUps, setFollowUps] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMatches(null);
    setFollowUps([]);
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.detail
            ? `${data.error} [${data.status ?? "?"}] ${data.detail}`
            : data.error ?? "Request failed.",
        );
      } else {
        setMatches(data.matches);
        setFollowUps(data.followUps ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function addFollowUp(q: string) {
    setDescription((d) => `${d.trim()}\n\n${q} `);
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <main className="container">
      <div className="hero">
        <div className="tag">RegScout</div>
        <h1>Map your regulatory, grant &amp; partner landscape</h1>
        <p>
          Describe what your venture does. We&apos;ll surface the federal and
          California regulations you may face, the grants you could pursue, and
          the partners worth knowing — sorted into three columns.
        </p>
      </div>

      <form onSubmit={analyze}>
        <textarea
          ref={textareaRef}
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
          <button className="primary" type="submit" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {followUps.length > 0 && (
        <section className="followups">
          <h2>Refine your results</h2>
          <p>Answer one of these and re-run to sharpen the matches:</p>
          <div className="followup-list">
            {followUps.map((q, i) => (
              <button key={i} type="button" onClick={() => addFollowUp(q)}>
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {matches && (
        <section className="board">
          {COLUMNS.map((col) => {
            const items = matches.filter((m) => m.record.type === col.type);
            return (
              <div className="column" key={col.type}>
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
        Prototype on a hand-curated federal + California dataset. Summaries are for
        orientation only — confirm specifics against the linked official source
        before making a compliance or funding decision.
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
