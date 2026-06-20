"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "names" | "csv" | "manual";

interface CompanyInput {
  name: string;
  description?: string | null;
  sector?: string | null;
  stage?: string | null;
  geography?: string | null;
  website?: string | null;
}

interface Draft {
  name: string;
  description: string;
  sector: string;
  stage: string;
  geography: string;
}

const STAGES = ["", "Pre-seed", "Seed", "Series A", "Growth", "Established"];

function emptyDraft(): Draft {
  return { name: "", description: "", sector: "", stage: "", geography: "" };
}

/** Minimal CSV parser: handles quoted fields, embedded commas, and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

const CSV_COLS = ["name", "description", "sector", "stage", "geography", "website"];

function csvToCompanies(text: string): CompanyInput[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const first = rows[0].map((c) => c.toLowerCase().trim());
  const hasHeader = first.includes("name");
  const idx: Record<string, number> = {};
  CSV_COLS.forEach((c, i) => {
    idx[c] = hasHeader ? first.indexOf(c) : i;
  });
  const at = (r: string[], i: number) =>
    i >= 0 && i < r.length ? r[i].trim() : "";

  return rows
    .slice(hasHeader ? 1 : 0)
    .map((r) => ({
      name: at(r, idx.name),
      description: at(r, idx.description) || null,
      sector: at(r, idx.sector) || null,
      stage: at(r, idx.stage) || null,
      geography: at(r, idx.geography) || null,
      website: at(r, idx.website) || null,
    }))
    .filter((c) => c.name);
}

function namesToCompanies(text: string): CompanyInput[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, website] = l.split(",").map((s) => s.trim());
      return { name, website: website || null };
    })
    .filter((c) => c.name);
}

export default function NewPortfolioForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("names");
  const [name, setName] = useState("");
  const [namesText, setNamesText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<Draft[]>([emptyDraft()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<Draft>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, emptyDraft()]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));
  }

  function buildCompanies(): CompanyInput[] {
    if (mode === "names") return namesToCompanies(namesText);
    if (mode === "csv") return csvToCompanies(csvText);
    return rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        description: r.description.trim() || null,
        sector: r.sector.trim() || null,
        stage: r.stage.trim() || null,
        geography: r.geography.trim() || null,
      }));
  }

  const detected = buildCompanies().length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const companies = buildCompanies();
    if (companies.length === 0) {
      setError("Add at least one company (a name is enough).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Untitled portfolio",
          companies,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.portfolio) {
        setError(data.error ?? "Could not create the portfolio. Please try again.");
        return;
      }
      router.push(`/portfolios/${data.portfolio.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-card">
      <form onSubmit={submit} className="portfolio-form">
        <label className="field">
          <span>Portfolio name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Climate Fund I — active book"
          />
        </label>

        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === "names" ? "active" : ""}`}
            onClick={() => setMode("names")}
          >
            By name (web research)
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === "csv" ? "active" : ""}`}
            onClick={() => setMode("csv")}
          >
            Paste CSV
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === "manual" ? "active" : ""}`}
            onClick={() => setMode("manual")}
          >
            Enter manually
          </button>
        </div>

        {mode === "names" && (
          <label className="field">
            <span>Company names — one per line (optionally “Name, website”)</span>
            <textarea
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder={"Heirloom Carbon\nForm Energy, formenergy.com\nTwelve"}
              rows={6}
            />
            <span className="muted">
              We&apos;ll research each company on the web to draft its profile,
              then score it. Drafts are editable later.
            </span>
          </label>
        )}

        {mode === "csv" && (
          <label className="field">
            <span>
              Paste CSV — columns: name, description, sector, stage, geography,
              website (header row optional)
            </span>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={
                "name,description,sector,stage,geography\nHeirloom,Direct air capture using limestone,Carbon removal,Series B,California"
              }
              rows={6}
            />
            <span className="muted">
              Rows missing a description are auto-researched on the web.
            </span>
          </label>
        )}

        {mode === "manual" && (
          <div className="portfolio-rows">
            {rows.map((r, i) => (
              <div className="portfolio-row" key={i}>
                <div className="portfolio-row-head">
                  <span className="portfolio-row-num">Company {i + 1}</span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => removeRow(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="portfolio-row-grid">
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="Company name"
                  />
                  <input
                    type="text"
                    value={r.sector}
                    onChange={(e) => update(i, { sector: e.target.value })}
                    placeholder="Sector (optional)"
                  />
                  <select
                    value={r.stage}
                    onChange={(e) => update(i, { stage: e.target.value })}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s || "Stage (optional)"}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={r.geography}
                    onChange={(e) => update(i, { geography: e.target.value })}
                    placeholder="Geography (optional)"
                  />
                </div>
                <textarea
                  value={r.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="What does this company do? (leave blank to auto-research)"
                  rows={2}
                />
              </div>
            ))}
            <button type="button" className="pill-btn ghost" onClick={addRow}>
              + Add company
            </button>
          </div>
        )}

        <div className="portfolio-form-actions">
          <span className="muted">
            {detected} {detected === 1 ? "company" : "companies"} detected
          </span>
          <button
            type="submit"
            className="pill-btn"
            disabled={loading || detected === 0}
          >
            {loading && <span className="spinner" />}
            Create &amp; score
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </form>
    </section>
  );
}
