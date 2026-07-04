"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScoredOpportunity } from "@/lib/types";

export interface RollupItem {
  opp: ScoredOpportunity;
  /** Deduped company attributions across the user's portfolios. */
  holders: { company: string; portfolio: string; portfolioId: string }[];
}

type Kind = "all" | "grant" | "regulation";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DeadlinesRollup({
  items,
  portfolios,
}: {
  items: RollupItem[];
  portfolios: { id: string; name: string }[];
}) {
  const [kind, setKind] = useState<Kind>("all");
  const [portfolioId, setPortfolioId] = useState<string>("all");

  const matchesKind = (i: RollupItem) =>
    kind === "all" ||
    (kind === "grant"
      ? i.opp.type === "grant_deadline"
      : i.opp.type !== "grant_deadline");
  const matchesPortfolio = (i: RollupItem) =>
    portfolioId === "all" ||
    i.holders.some((h) => h.portfolioId === portfolioId);

  const visible = items.filter((i) => matchesKind(i) && matchesPortfolio(i));

  const grantCount = items.filter(
    (i) => i.opp.type === "grant_deadline" && matchesPortfolio(i),
  ).length;
  const regCount = items.filter(
    (i) => i.opp.type !== "grant_deadline" && matchesPortfolio(i),
  ).length;

  return (
    <>
      <div className="rollup-filters">
        <div className="rollup-filter-row">
          <span className="muted">Type</span>
          <button
            type="button"
            className={`mode-tab ${kind === "all" ? "active" : ""}`}
            onClick={() => setKind("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`mode-tab ${kind === "grant" ? "active" : ""}`}
            onClick={() => setKind("grant")}
          >
            Grants ({grantCount})
          </button>
          <button
            type="button"
            className={`mode-tab ${kind === "regulation" ? "active" : ""}`}
            onClick={() => setKind("regulation")}
          >
            Regulations ({regCount})
          </button>
        </div>
        {portfolios.length > 1 && (
          <div className="rollup-filter-row">
            <span className="muted">Portfolio</span>
            <button
              type="button"
              className={`mode-tab ${portfolioId === "all" ? "active" : ""}`}
              onClick={() => setPortfolioId("all")}
            >
              All
            </button>
            {portfolios.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`mode-tab ${portfolioId === p.id ? "active" : ""}`}
                onClick={() => setPortfolioId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          Nothing matches these filters. Widen them, or re-score a portfolio to
          pull in fresh deadlines.
        </p>
      ) : (
        <section className="glass-card act-quarter">
          <ul className="act-list">
            {visible.map(({ opp, holders }) => (
              <li key={opp.id} className="act-item">
                <span className="act-deadline">{fmtDate(opp.deadline!)}</span>
                <span className="act-body">
                  <a href={opp.url} target="_blank" rel="noopener noreferrer">
                    {opp.title}
                  </a>
                  <span className="act-meta">
                    {opp.agency ? `${opp.agency} · ` : ""}
                    {opp.type === "grant_deadline" ? "Grant" : "Comment period"}
                  </span>
                  <span className="act-companies">
                    {holders.map((h, i) => (
                      <span key={`${h.portfolioId}-${h.company}`}>
                        {i > 0 && ", "}
                        {h.company}{" "}
                        <Link
                          href={`/portfolios/${h.portfolioId}`}
                          className="act-portfolio"
                        >
                          ({h.portfolio})
                        </Link>
                      </span>
                    ))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
