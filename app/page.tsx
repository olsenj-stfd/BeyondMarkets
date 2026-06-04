"use client";

import { useState } from "react";
import type { EnrichedMatch } from "@/lib/types";

const EXAMPLES = [
  "We build hydrogen fuel-cell powertrains for heavy-duty trucks, manufacturing pilot units in the Bay Area.",
  "We're a carbon-accounting SaaS helping mid-size manufacturers measure and report Scope 1-3 emissions.",
  "We develop a novel catalytic process that captures NOx from industrial exhaust, with a pilot line in the Central Valley.",
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[] | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMatches(null);
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
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="hero">
        <div className="tag">RegScout</div>
        <h1>Map your regulatory & grant landscape</h1>
        <p>
          Describe what your venture does. We&apos;ll surface the regulations you
          may face and the grants you could pursue — starting with California air
          quality and climate tech.
        </p>
      </div>

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
          <button className="primary" type="submit" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {matches && (
        <section className="results">
          <div className="results-head">
            {matches.length === 0
              ? "No strong matches in the current dataset."
              : `${matches.length} relevant ${
                  matches.length === 1 ? "item" : "items"
                }, most relevant first.`}
          </div>
          {matches.map((m) => (
            <ResultCard key={m.id} match={m} />
          ))}
        </section>
      )}

      <p className="disclaimer">
        Prototype on a hand-curated California air-quality &amp; climate dataset.
        Summaries are for orientation only — confirm specifics against the linked
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
        <div>
          <h3>{r.title}</h3>
          <div className="badges">
            <span className={`badge ${r.type === "grant" ? "grant" : "reg"}`}>
              {r.type === "grant" ? "Grant / Incentive" : "Regulation"}
            </span>
            <span className="badge">{r.agencyAcronym}</span>
            <span className="badge">{r.level}</span>
          </div>
        </div>
        <div className="relevance">
          {match.relevance}
          <span>relevance</span>
        </div>
      </div>

      <div className="why">
        <strong>How this affects you</strong>
        {match.whyRelevant}
      </div>

      <div className="section">
        <h4>Summary</h4>
        <p>{r.summary}</p>
      </div>

      <div className="section">
        <h4>Applies to</h4>
        <p>{r.applicability}</p>
      </div>

      <div className="section">
        <h4>Context</h4>
        <p>{r.context}</p>
      </div>

      <div className="section">
        <h4>How to engage with {r.agencyAcronym}</h4>
        <p>{r.howToEngage}</p>
      </div>

      <div className="card-foot">
        <span className="badge">{r.jurisdiction}</span>
        <a href={r.link} target="_blank" rel="noopener noreferrer">
          Official source ↗
        </a>
      </div>
    </article>
  );
}
