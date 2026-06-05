"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EnrichedMatch, FollowUp, LiveRegResult } from "@/lib/types";
import { ResultBoard } from "@/app/components/Results";

export default function ProjectAnalysis({
  projectId,
  initialMatches,
  initialFollowUps,
  initialRegulations,
}: {
  projectId: string;
  initialMatches: EnrichedMatch[];
  initialFollowUps: FollowUp[];
  initialRegulations: LiveRegResult[];
}) {
  const [matches, setMatches] = useState<EnrichedMatch[]>(initialMatches);
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps);
  const [regulations, setRegulations] =
    useState<LiveRegResult[]>(initialRegulations);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [refinements, setRefinements] = useState<string[]>([]);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranOnce = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const analyze = useCallback(
    async (extra?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extra ? { extra } : {}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not analyze this project. Please try again.");
          return false;
        }
        setMatches(data.matches ?? []);
        setFollowUps(data.followUps ?? []);
        setRegulations(data.regulations ?? []);
        setSelections({});
        return true;
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  // Compute on first open if we don't have a cached analysis yet.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    if (initialMatches.length === 0) void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refine() {
    const newLines = followUps
      .map((f, i) => (selections[i] ? `- ${f.question} → ${selections[i]}` : null))
      .filter((x): x is string => x !== null);
    if (newLines.length === 0) return;

    const allRefinements = [...refinements, ...newLines];
    setRefinements(allRefinements);
    const ok = await analyze(allRefinements.join("\n"));
    if (ok) {
      setFollowUpsOpen(false);
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const hasSelection = Object.keys(selections).length > 0;

  return (
    <>
      <div className="analysis-head">
        <h2 className="section-title">Regulations, funding &amp; partners</h2>
        {matches.length > 0 && !loading && followUps.length > 0 && !followUpsOpen && (
          <button
            type="button"
            className="pill-btn ghost"
            onClick={() => setFollowUpsOpen(true)}
          >
            Refine ↺
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

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
                          ? Object.fromEntries(
                              Object.entries(s).filter(([k]) => k !== String(qi)),
                            )
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

      {loading && matches.length === 0 ? (
        <p className="empty">
          Analyzing regulations, funding opportunities, and partners for this
          venture…
        </p>
      ) : (
        <ResultBoard
          matches={matches}
          regulations={regulations}
          boardRef={boardRef}
        />
      )}
    </>
  );
}
