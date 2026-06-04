"use client";

import type { EnrichedMatch, RecordType } from "@/lib/types";

const COLUMNS: { type: RecordType; label: string; blurb: string }[] = [
  { type: "regulation", label: "Regulations", blurb: "Rules you may need to comply with" },
  { type: "grant", label: "Ongoing Funding Opportunities", blurb: "Grants, rebates, loans & tax credits" },
  { type: "partner", label: "Potential Partners", blurb: "Ecosystem & capital partners" },
];

export function ResultBoard({
  matches,
  boardRef,
}: {
  matches: EnrichedMatch[];
  boardRef?: React.Ref<HTMLDivElement>;
}) {
  return (
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
