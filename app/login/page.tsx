"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Beta access is passwordless: testers just type their email and they're in.
 * To keep using Supabase auth (and its row-level security for per-user
 * projects) we derive a deterministic credential from the email rather than
 * asking for a password. This relies on "Confirm email" being OFF in the
 * Supabase Auth settings so a fresh sign-up has an immediate session.
 */
function betaCredential(email: string): string {
  return `regscout-beta::${email.trim().toLowerCase()}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const normalized = email.trim().toLowerCase();
    const password = betaCredential(normalized);

    try {
      // Returning tester: sign in with the derived credential.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      if (!signInError) {
        router.push("/");
        router.refresh();
        return;
      }

      // New tester: create the account, then they're straight in.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalized,
        password,
      });
      if (signUpError) {
        setError(
          /already registered/i.test(signUpError.message)
            ? "That email is already set up, but we couldn't sign you in. Please contact the team."
            : signUpError.message,
        );
        return;
      }
      if (!data.session) {
        // Email confirmation is still enabled in Supabase — beta access needs
        // it turned off so the session is immediate.
        setError(
          "Almost there — email confirmation needs to be disabled for beta. Please contact the team.",
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <Link href="/" className="back-link">
        ← Back
      </Link>
      <section className="glass-card auth-card">
        <h1 className="auth-title">Enter the beta</h1>
        <p className="auth-sub">
          We&apos;re in beta — no password needed. Just enter your email to save
          projects and track your regulatory landscape.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </label>
          <button className="pill-btn" type="submit" disabled={loading}>
            {loading && <span className="spinner" />}
            Continue
          </button>
        </form>

        <p className="auth-fineprint">
          By continuing you agree to take part in our beta. Have thoughts?{" "}
          <Link href="/feedback" className="link-btn inline">
            Share feedback
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
