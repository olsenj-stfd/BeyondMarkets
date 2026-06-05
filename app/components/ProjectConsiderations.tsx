"use client";

import { useEffect, useRef, useState } from "react";
import type { Consideration } from "@/lib/types";

export default function ProjectConsiderations({
  projectId,
  initialConsiderations,
}: {
  projectId: string;
  initialConsiderations: Consideration[];
}) {
  const [considerations, setConsiderations] = useState<Consideration[]>(
    initialConsiderations,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranOnce = useRef(false);

  async function research() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/digest`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not research this project. Please try again.");
        return;
      }
      setConsiderations(data.considerations ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Research the web on first open if we don't have a cached digest yet.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    if (initialConsiderations.length === 0) {
      void research();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasResults = considerations.length > 0;

  return (
    <section className="glass-card considerations">
      <div className="considerations-head">
        <h2 className="section-title">Things to consider</h2>
        {hasResults && !loading && (
          <button
            type="button"
            className="pill-btn ghost"
            onClick={research}
          >
            Refresh ↺
          </button>
        )}
      </div>
      <p className="considerations-sub">
        Live web research — recent policy, funding, market, and risk signals
        relevant to this venture.
      </p>

      {error && <div className="error">{error}</div>}

      {loading && !hasResults ? (
        <p className="empty">Researching recent news and signals on the web…</p>
      ) : hasResults ? (
        <ul className="consideration-list">
          {considerations.map((c, i) => (
            <li key={i} className="consideration">
              <span className="consideration-point">{c.point}</span>
              {c.source && (
                <span className="consideration-source">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      {c.source} ↗
                    </a>
                  ) : (
                    c.source
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !error && (
          <p className="empty">
            No specific signals surfaced this time. Try refreshing.
          </p>
        )
      )}
    </section>
  );
}
