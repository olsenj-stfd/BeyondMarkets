"use client";

import type { EnrichedMatch, LiveRegResult, RecordType } from "@/lib/types";

const CURATED_COLUMNS: { type: RecordType; label: string; blurb: string }[] = [
  { type: "grant", label: "Ongoing Funding Opportunities", blurb: "Grants, rebates, loans & tax credits" },
  { type: "partner", label: "Potential Partners", blurb: "Ecosystem & capital partners" },
];

export function ResultBoard({
  matches,
  regulations,
  boardRef,
}: {
  matches: EnrichedMatch[];
  regulations: LiveRegResult[];
  boardRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <section className="board" ref={boardRef}>
      <div className="column col-regulation">
        <div className="column-head">
          <h2>
            Regulations <span className="count">{regulations.length}</span>
          </h2>
          <p>Specific federal rules, found live in eCFR &amp; the Federal Register</p>
        </div>
        {regulations.length === 0 ? (
          <p className="empty">No specific federal regulations matched yet.</p>
        ) : (
          regulations.map((r) => <RegCard key={r.id} reg={r} />)
        )}
      </div>

      {CURATED_COLUMNS.map((col) => {
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

/** A live regulation result (eCFR section or open Federal Register rulemaking). */
function RegCard({ reg }: { reg: LiveRegResult }) {
  const proposed = reg.kind === "proposed";
  const deadline = reg.commentsCloseOn
    ? new Date(reg.commentsCloseOn + "T00:00:00").toLocaleDateString()
    : null;
  return (
    <article className="card">
      <div className="card-top">
        <h3>{reg.title}</h3>
      </div>

      <div className="badges">
        <span className={`badge ${proposed ? "badge-proposed" : "badge-inforce"}`}>
          {proposed ? "Open comment" : "In force"}
        </span>
        <span className="badge">{reg.citation}</span>
        {reg.source === "ecfr" ? (
          <span className="badge">eCFR</span>
        ) : (
          <span className="badge">Fed. Register</span>
        )}
      </div>

      {reg.agency && <p className="why">{reg.agency}</p>}

      {proposed && deadline && (
        <div className="key-dates">
          <h4>
            <CalendarIcon /> Comment period
          </h4>
          <ul>
            <li>Comments close {deadline}</li>
          </ul>
        </div>
      )}

      {reg.excerpt && (
        <details className="more">
          <summary>Matched text</summary>
          <div className="more-body">
            <p>&ldquo;{reg.excerpt}&rdquo;</p>
          </div>
        </details>
      )}

      <a href={reg.url} target="_blank" rel="noopener noreferrer">
        Official source ↗
      </a>
    </article>
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
