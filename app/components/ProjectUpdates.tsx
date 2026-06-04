"use client";

import { useState } from "react";
import type { ProjectUpdate } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectUpdates({
  projectId,
  initialUpdates,
}: {
  projectId: string;
  initialUpdates: ProjectUpdate[];
}) {
  const [updates, setUpdates] = useState<ProjectUpdate[]>(initialUpdates);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addUpdate(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save the update. Please try again.");
        return;
      }
      setUpdates(data.updates ?? []);
      setDraft("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeUpdate(updateId: string) {
    const prev = updates;
    setUpdates((u) => u.filter((x) => x.id !== updateId)); // optimistic
    try {
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId }),
      });
      if (!res.ok) setUpdates(prev); // rollback
    } catch {
      setUpdates(prev); // rollback
    }
  }

  return (
    <section className="project-updates">
      <h2 className="section-title">Updates</h2>
      <p className="intro-text">
        Log dated progress notes as your venture evolves — milestones, scope
        changes, conversations with agencies or funders. The original
        description stays intact.
      </p>

      <form className="update-form" onSubmit={addUpdate}>
        <textarea
          className="update-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an update… (e.g. 'Submitted CalSEED concept paper; awaiting review.')"
          rows={3}
          maxLength={2000}
        />
        <div className="update-form-foot">
          {error && <span className="error-inline">{error}</span>}
          <button
            type="submit"
            className="pill-btn"
            disabled={saving || !draft.trim()}
          >
            {saving ? "Saving…" : "Add update"}
          </button>
        </div>
      </form>

      {updates.length === 0 ? (
        <p className="empty">No updates yet.</p>
      ) : (
        <ul className="update-list">
          {updates.map((u) => (
            <li key={u.id} className="update-item">
              <div className="update-item-head">
                <span className="update-date">{formatDate(u.createdAt)}</span>
                <button
                  type="button"
                  className="update-remove"
                  onClick={() => removeUpdate(u.id)}
                  aria-label="Delete update"
                  title="Delete update"
                >
                  ×
                </button>
              </div>
              <p className="update-body">{u.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
