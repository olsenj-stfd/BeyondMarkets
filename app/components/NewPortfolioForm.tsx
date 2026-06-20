"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function NewPortfolioForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
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

  const ready =
    rows.filter((r) => r.name.trim() && r.description.trim().length >= 10)
      .length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const companies = rows
        .filter((r) => r.name.trim() && r.description.trim().length >= 10)
        .map((r) => ({
          name: r.name.trim(),
          description: r.description.trim(),
          sector: r.sector.trim() || null,
          stage: r.stage.trim() || null,
          geography: r.geography.trim() || null,
        }));

      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Untitled portfolio", companies }),
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

  if (!open) {
    return (
      <div className="portfolio-new-cta">
        <button type="button" className="pill-btn" onClick={() => setOpen(true)}>
          + New portfolio
        </button>
      </div>
    );
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
                placeholder="What does this company do? (one or two sentences)"
                rows={2}
              />
            </div>
          ))}
        </div>

        <div className="portfolio-form-actions">
          <button type="button" className="pill-btn ghost" onClick={addRow}>
            + Add company
          </button>
          <button
            type="submit"
            className="pill-btn"
            disabled={loading || !ready}
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
