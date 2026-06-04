"use client";

import Link from "next/link";
import { useState } from "react";

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export default function ProjectsList({ projects }: { projects: ProjectSummary[] }) {
  const [items, setItems] = useState(projects);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    setBusy(id);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((xs) => xs.filter((p) => p.id !== id));
    }
    setBusy(null);
  }

  if (items.length === 0) {
    return (
      <p className="empty">
        No saved projects yet. Run an analysis on the{" "}
        <Link href="/">home page</Link> and save it.
      </p>
    );
  }

  return (
    <ul className="project-list">
      {items.map((p) => (
        <li key={p.id} className="project-row glass-card">
          <Link href={`/projects/${p.id}`} className="project-link">
            <h3>{p.name}</h3>
            <p className="project-desc">{p.description}</p>
            <span className="project-date">
              {new Date(p.createdAt).toLocaleDateString()}
            </span>
          </Link>
          <button
            type="button"
            className="nav-link as-button danger"
            onClick={() => remove(p.id)}
            disabled={busy === p.id}
          >
            {busy === p.id ? "Deleting…" : "Delete"}
          </button>
        </li>
      ))}
    </ul>
  );
}
