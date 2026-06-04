"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RankedOpportunity } from "@/lib/types";
import OpportunityCard from "@/app/components/OpportunityCard";
import { useFavorites } from "@/app/components/useFavorites";

const STALE_MS = 24 * 60 * 60 * 1000; // re-rank if the cache is older than a day

export default function ProjectDeadlines({
  projectId,
  initialRanked,
  rankedAt,
  favoriteIds,
}: {
  projectId: string;
  initialRanked: RankedOpportunity[];
  rankedAt: string | null;
  favoriteIds: string[];
}) {
  const { ids: starred, toggle } = useFavorites(favoriteIds);
  const [ranked, setRanked] = useState<RankedOpportunity[]>(initialRanked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(rankedAt);
  const ranOnce = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunities/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not load deadlines. Please try again.");
        return;
      }
      setRanked(data.ranked ?? []);
      setUpdatedAt(new Date().toISOString());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Auto-run on first mount when there's no cache or it's stale.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const stale =
      !updatedAt || Date.now() - new Date(updatedAt).getTime() > STALE_MS;
    if (initialRanked.length === 0 || stale) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="project-deadlines">
      <div className="project-deadlines-head">
        <h2 className="section-title">Upcoming deadlines for this venture</h2>
        <div className="project-deadlines-meta">
          {updatedAt && !loading && (
            <span className="opp-source">
              Updated {new Date(updatedAt).toLocaleDateString()}
            </span>
          )}
          <button
            type="button"
            className="pill-btn ghost"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Ranking…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && ranked.length === 0 ? (
        <p className="empty">Ranking opportunities for this venture…</p>
      ) : ranked.length === 0 ? (
        <p className="empty">
          No upcoming deadlines matched this venture yet. New opportunities are
          ingested daily — check back, or refine the project description.
        </p>
      ) : (
        <ul className="opp-list">
          {ranked.map((o) => (
            <OpportunityCard
              key={o.id}
              o={o}
              starred={starred.has(o.id)}
              onToggleStar={toggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
