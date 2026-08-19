"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";

const CATEGORIES = [
  "General",
  "Bug / something broke",
  "Idea / feature request",
  "Results quality",
  "Confusing / hard to use",
];

export default function FeedbackPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send your feedback. Please try again.");
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <Header />

      <section className="glass-card intro-card">
        <h2 className="section-title">Share feedback</h2>
        <p className="intro-text">
          RegScout is a beta. Tell us what&apos;s working, what&apos;s broken,
          or what you wish it did. Every note shapes what gets built next.
        </p>

        {sent ? (
          <div className="notice">
            Thanks. Your feedback was sent.{" "}
            <button
              type="button"
              className="link-btn inline"
              onClick={() => setSent(false)}
            >
              Send more
            </button>
            {" "}or{" "}
            <Link href="/" className="link-btn inline">
              go home
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            {error && <div className="error">{error}</div>}

            <label className="field">
              <span>Topic</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Email (optional, if you&apos;d like a reply)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@foundation.org"
                autoComplete="email"
              />
            </label>

            <label className="field">
              <span>Your feedback</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did you think? What would make this more useful?"
                rows={6}
                required
              />
            </label>

            <button
              className="pill-btn"
              type="submit"
              disabled={loading || message.trim().length < 3}
            >
              {loading && <span className="spinner" />}
              Send feedback
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
