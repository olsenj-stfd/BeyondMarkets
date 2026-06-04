"use client";

import { useMemo, useState } from "react";
import type { Opportunity, RankedOpportunity } from "@/lib/types";
import OpportunityCard from "@/app/components/OpportunityCard";
import { useFavorites } from "@/app/components/useFavorites";

interface ProjectOption {
  id: string;
  name: string;
}

type Jurisdiction = "all" | "federal" | "california";

export default function DeadlinesDashboard({
  opportunities,
  tracked,
  projects,
  favoriteIds,
  signedIn = true,
}: {
  opportunities: Opportunity[];
  tracked: Opportunity[];
  projects: ProjectOption[];
  favoriteIds: string[];
  signedIn?: boolean;
}) {
  const { ids: starred, toggle } = useFavorites(favoriteIds);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("all");
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [ranked, setRanked] = useState<RankedOpportunity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browseList = useMemo(() => {
    if (jurisdiction === "all") return opportunities;
    return opportunities.filter((o) => o.jurisdiction === jurisdiction);
  }, [opportunities, jurisdiction]);

  // The tracked rollup reflects live stars: start from the server list, then
  // honor optimistic toggles (drop unstarred; the browse list backfills adds).
  const trackedNow = useMemo(() => {
    const seen = new Map<string, Opportunity>();
    for (const o of [...tracked, ...opportunities]) {
      if (starred.has(o.id) && !seen.has(o.id)) seen.set(o.id, o);
    }
    return [...seen.values()].sort((a, b) =>
      (a.deadline ?? "") < (b.deadline ?? "") ? -1 : 1,
    );
  }, [tracked, opportunities, starred]);

  async function personalize() {
    if (!projectId) return;
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
        setError(data.error ?? "Could not personalize. Please try again.");
        return;
      }
      setRanked(data.ranked ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const showing = ranked ?? browseList;

  return (
    <>
      {signedIn && trackedNow.length > 0 && (
        <section className="tracking-section">
          <h3 className="tracking-title">★ Tracking</h3>
          <ul className="opp-list">
            {trackedNow.map((o) => (
              <OpportunityCard
                key={o.id}
                o={o}
                starred={starred.has(o.id)}
                onToggleStar={toggle}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="glass-card opp-controls">
        {projects.length > 0 ? (
          <div className="opp-personalize">
            <label htmlFor="opp-project">Personalize for</label>
            <select
              id="opp-project"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setRanked(null);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pill-btn"
              onClick={personalize}
              disabled={loading}
            >
              {loading ? "Ranking…" : "Rank for this project"}
            </button>
            {ranked && (
              <button
                type="button"
                className="pill-btn ghost"
                onClick={() => setRanked(null)}
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          <p className="save-hint">
            Save a project to get a personalized, ranked list of these deadlines.
          </p>
        )}

        {!ranked && (
          <div className="opp-filters">
            {(["all", "federal", "california"] as Jurisdiction[]).map((j) => (
              <button
                key={j}
                type="button"
                className={`chip ${jurisdiction === j ? "selected" : ""}`}
                onClick={() => setJurisdiction(j)}
              >
                {j === "all" ? "All" : j === "federal" ? "Federal" : "California"}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && <div className="error">{error}</div>}

      {ranked && (
        <p className="opp-context">
          Ranked against your project — nearest deadline first.
        </p>
      )}

      {showing.length === 0 ? (
        <p className="empty">
          {ranked
            ? "No upcoming opportunities matched this project."
            : "No upcoming opportunities yet. They populate after the daily ingestion runs."}
        </p>
      ) : (
        <ul className="opp-list">
          {showing.map((o) => (
            <OpportunityCard
              key={o.id}
              o={o}
              starred={starred.has(o.id)}
              onToggleStar={toggle}
              canStar={signedIn}
            />
          ))}
        </ul>
      )}
    </>
  );
}
