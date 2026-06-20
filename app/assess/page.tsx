"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { RankedOpportunity } from "@/lib/types";
import Header from "@/app/components/Header";
import OpportunityCard from "@/app/components/OpportunityCard";

const EXAMPLES = [
  "We build hydrogen fuel-cell powertrains for heavy-duty trucks, manufacturing pilot units in the Bay Area.",
  "We're a carbon-accounting SaaS helping mid-size manufacturers measure and report Scope 1-3 emissions.",
  "We develop a catalytic process that captures NOx from industrial exhaust, with a pilot line in the Central Valley.",
  "We make compostable packaging from agricultural waste, sold to California food brands.",
];

const CA_OPERATING = ["Yes", "Planning to", "No"];

const COMPANY_STAGES = [
  "Idea / pre-seed",
  "Seed",
  "Series A / growth",
  "Scaling / established",
];

// "Not building" and "Statewide / multiple" first, then all 58 CA counties.
const CA_COUNTY_OPTIONS = [
  "Not building a facility",
  "Statewide / multiple counties",
  "Alameda",
  "Alpine",
  "Amador",
  "Butte",
  "Calaveras",
  "Colusa",
  "Contra Costa",
  "Del Norte",
  "El Dorado",
  "Fresno",
  "Glenn",
  "Humboldt",
  "Imperial",
  "Inyo",
  "Kern",
  "Kings",
  "Lake",
  "Lassen",
  "Los Angeles",
  "Madera",
  "Marin",
  "Mariposa",
  "Mendocino",
  "Merced",
  "Modoc",
  "Mono",
  "Monterey",
  "Napa",
  "Nevada",
  "Orange",
  "Placer",
  "Plumas",
  "Riverside",
  "Sacramento",
  "San Benito",
  "San Bernardino",
  "San Diego",
  "San Francisco",
  "San Joaquin",
  "San Luis Obispo",
  "San Mateo",
  "Santa Barbara",
  "Santa Clara",
  "Santa Cruz",
  "Shasta",
  "Sierra",
  "Siskiyou",
  "Solano",
  "Sonoma",
  "Stanislaus",
  "Sutter",
  "Tehama",
  "Trinity",
  "Tulare",
  "Tuolumne",
  "Ventura",
  "Yolo",
  "Yuba",
];

/**
 * Fold the structured scoping answers into the free-text description so the
 * matcher can scope its database scrub (CA vs. federal-only, which regional air
 * district / county programs apply, and how to weight grants vs. compliance by
 * company stage). This block is prepended to the user's own words.
 */
function withProfile(
  description: string,
  profile: { operatingCA: string; county: string; stage: string },
): string {
  const lines = [
    `- Operating in California: ${profile.operatingCA}`,
    profile.operatingCA !== "No"
      ? `- County of planned facility: ${profile.county}`
      : null,
    `- Company stage: ${profile.stage}`,
  ].filter((x): x is string => x !== null);
  return `Company profile:\n${lines.join("\n")}\n\n${description.trim()}`;
}

interface Result {
  projectId: string;
  name: string;
  ranked: RankedOpportunity[];
  deadlineError: string | null;
}

export default function QuickAssess() {
  const [description, setDescription] = useState("");
  const [operatingCA, setOperatingCA] = useState("");
  const [county, setCounty] = useState("");
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    setElapsed(0);
    const startedAt = Date.now();
    const ticker = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    try {
      const fullText = withProfile(description, { operatingCA, county, stage });

      // 1. Auto-save as a project (server generates a best-guess title).
      const pRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: fullText }),
      });
      const pData = await pRes.json().catch(() => ({}));
      if (!pRes.ok || !pData.project) {
        setError(pData.error ?? "Could not save your analysis. Please try again.");
        return;
      }
      const project = pData.project as { id: string; name: string };

      // 2. Rank upcoming deadlines for this venture (the primary first result).
      const dRes = await fetch("/api/opportunities/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const dData = await dRes.json().catch(() => ({}));
      setResult({
        projectId: project.id,
        name: project.name,
        ranked: dRes.ok ? (dData.ranked ?? []) : [],
        deadlineError: dRes.ok ? null : (dData.error ?? "Could not load deadlines."),
      });
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }

  const profileComplete =
    operatingCA !== "" &&
    stage !== "" &&
    (operatingCA === "No" || county !== "");

  return (
    <main className="page">
      <Header />

      <section className="glass-card intro-card">
        <span className="project-date">Quick assessment · one company</span>
        <h2 className="section-title">Single-venture check</h2>
        <p className="intro-text">
          Describe one venture and we&apos;ll save it as a project and surface the
          grant and comment-period deadlines that matter most — its full landscape
          of regulations, funding, and partners lives on the project page. For a
          whole book, use <Link href="/">Portfolio mode</Link>.
        </p>
        <form onSubmit={analyze}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We build zero-emission refrigerated trailers for regional grocery fleets, assembled in California…"
          />

          <div className="scoping">
            <label className="scoping-field">
              <span className="scoping-label">Operating in California?</span>
              <select value={operatingCA} onChange={(e) => setOperatingCA(e.target.value)}>
                <option value="">Select…</option>
                {CA_OPERATING.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>

            <label className="scoping-field">
              <span className="scoping-label">County of planned facility</span>
              <input
                type="text"
                list="county-options"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={operatingCA === "No"}
                placeholder="Type or select…"
                autoComplete="off"
              />
              <datalist id="county-options">
                {CA_COUNTY_OPTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="scoping-field">
              <span className="scoping-label">Company stage</span>
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">Select…</option>
                {COMPANY_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

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
              disabled={loading || description.trim().length < 20 || !profileComplete}
            >
              {loading && <span className="spinner" />}
              {loading ? `Analyzing… ${elapsed}s` : "Analyze"}
            </button>
          </div>
        </form>
      </section>

      {error && <div className="error">{error}</div>}

      {result && (
        <div ref={resultRef}>
          <section className="glass-card intro-card">
            <span className="project-date">Saved as a project</span>
            <h2 className="section-title">{result.name}</h2>
            <p className="intro-text">
              Your venture is saved. Open the project page for the full landscape
              of regulations, funding opportunities, and partners.
            </p>
            <Link href={`/projects/${result.projectId}`} className="pill-btn">
              Open full analysis →
            </Link>
          </section>

          <section className="project-deadlines">
            <div className="project-deadlines-head">
              <h2 className="section-title">Upcoming deadlines for this venture</h2>
            </div>

            {result.deadlineError ? (
              <div className="error">{result.deadlineError}</div>
            ) : result.ranked.length === 0 ? (
              <p className="empty">
                No upcoming deadlines matched this venture yet. New opportunities
                are ingested daily — check back, or open the project to refine.
              </p>
            ) : (
              <ul className="opp-list">
                {result.ranked.map((o) => (
                  <OpportunityCard
                    key={o.id}
                    o={o}
                    starred={false}
                    onToggleStar={() => {}}
                    canStar={false}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <p className="disclaimer">
        Prototype on a hand-curated federal + California dataset plus real, dated
        deadlines from official sources. Confirm specifics (especially dates,
        deadlines, and workshop/hearing schedules) against the linked official
        source before making a compliance or funding decision.
      </p>
    </main>
  );
}
