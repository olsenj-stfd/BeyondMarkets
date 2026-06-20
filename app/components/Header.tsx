"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="header">
      <Link href="/" className="brand">
        <div className="logo-mark" />
        <div>
          <h1>RegScout</h1>
          <p className="tagline">Regulatory · Grants · Partners</p>
        </div>
      </Link>
      <div className="header-right">
        <span className="scope-pill">Federal + California</span>
        {ready &&
          (email ? (
            <>
              <Link href="/dashboard" className="nav-link">
                Deadlines
              </Link>
              <Link href="/projects" className="nav-link">
                My projects
              </Link>
              <Link href="/portfolios" className="nav-link">
                Portfolios
              </Link>
              <Link href="/feedback" className="nav-link">
                Feedback
              </Link>
              <span className="user-email" title={email}>
                {email}
              </span>
              <form action="/auth/signout" method="post">
                <button type="submit" className="nav-link as-button">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="nav-link">
              Sign in
            </Link>
          ))}
      </div>
    </header>
  );
}
