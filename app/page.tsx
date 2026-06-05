"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EnrichedMatch, FollowUp } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import Header from "@/app/components/Header";
import { ResultBoard } from "@/app/components/Results";

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

export default function Home() {
  const [description, setDescription] = useState("");
  const [operatingCA, setOperatingCA] = useState("");
  const [county, setCounty] = useState("");
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [followUpsOpen, setFollowUpsOpen] = useState(false);
  const [refinements, setRefinements] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const [elapsed, setElapsed] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function runMatch(fullText: string) {
    setError(null);
    setLoading(true);
    setElapsed(0);
    const startedAt = Date.now();
    const ticker = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: fullText }),
      });

      // Validation/server errors come back as plain JSON, not a stream.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed (${res.status}).`);
        return false;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: { matches?: EnrichedMatch[]; followUps?: FollowUp[] } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.t === "error") {
            setError(msg.error ?? "Something went wrong. Please try again.");
            return false;
          }
          if (msg.t === "done") result = msg;
        }
      }

      if (!result) {
        // Stream ended without a result — usually the function hit its time limit.
        setError("The analysis took too long and timed out. Please try again.");
        return false;
      }

      setMatches(result.matches ?? []);
      setFollowUps(result.followUps ?? []);
      setSelections({});
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setMatches(null);
    setRefinements([]);
    setSaveMsg(null);
    const ok = await runMatch(withProfile(description, { operatingCA, county, stage }));
    if (ok) setFollowUpsOpen(true);
  }

  async function refine() {
    const newLines = followUps
      .map((f, i) => (selections[i] ? `- ${f.question} → ${selections[i]}` : null))
      .filter((x): x is string => x !== null);
    if (newLines.length === 0) return;

    const allRefinements = [...refinements, ...newLines];
    setRefinements(allRefinements);
    const base = withProfile(description, { operatingCA, county, stage });
    const fullText = `${base}\n\nAdditional context:\n${allRefinements.join("\n")}`;
    const ok = await runMatch(fullText);
    if (ok) {
      setFollowUpsOpen(false); // refine once; require explicit opt-in to go again
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function saveProject() {
    if (!matches) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const name = saveName.trim() || description.trim().slice(0, 60);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: withProfile(description, { operatingCA, county, stage }),
          matches,
          followUps,
        }),
      });
      if (res.ok) {
        setSaveMsg("Saved to your projects.");
        setSaveName("");
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveMsg(data.error ?? "Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const hasSelection = Object.keys(selections).length > 0;
  const profileComplete =
    operatingCA !== "" &&
    stage !== "" &&
    (operatingCA === "No" || county !== "");

  return (
    <main className="page">
      <Header />

      <section className="glass-card intro-card">
        <p className="intro-text">
          Describe what your venture does. We&apos;ll surface the regulations you
          may face, the grants you could pursue, and the partners worth knowing.
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
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={operatingCA === "No"}
              >
                <option value="">Select…</option>
                {CA_COUNTY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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

      {matches && !followUpsOpen && followUps.length > 0 && (
        <div className="refine-further">
          <button type="button" className="pill-btn ghost" onClick={() => setFollowUpsOpen(true)}>
            Refine further ↺
          </button>
        </div>
      )}

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
                          ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== String(qi)))
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
            {loading ? `Refining… ${elapsed}s` : "Refine my results"}
          </button>
        </section>
      )}

      {matches && (
        <div className="save-bar">
          {signedIn ? (
            <>
              <input
                className="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Name this project (optional)"
              />
              <button
                type="button"
                className="pill-btn"
                onClick={saveProject}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save project"}
              </button>
            </>
          ) : (
            <p className="save-hint">
              <Link href="/login">Sign in</Link> to save this analysis as a project.
            </p>
          )}
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
        </div>
      )}

      {matches && <ResultBoard matches={matches} boardRef={boardRef} />}

      <p className="disclaimer">
        Prototype on a hand-curated federal + California dataset. Summaries and
        timing notes are for orientation only — confirm specifics (especially
        dates, deadlines, and workshop/hearing schedules) against the linked
        official source before making a compliance or funding decision.
      </p>
    </main>
  );
}
