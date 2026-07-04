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
        {ready &&
          (email ? (
            <>
              {/* /assess (quick assessment) and /projects still exist but are
                  unlisted pending a revamp. */}
              <Link href="/" className="nav-link">
                My portfolios
              </Link>
              <Link href="/dashboard" className="nav-link">
                Deadlines
              </Link>
              <Link href="/feedback" className="nav-link">
                Feedback
              </Link>
              <Link href="/about" className="nav-link">
                About
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
            <>
              <Link href="/about" className="nav-link">
                About
              </Link>
              <Link href="/login" className="nav-link">
                Sign in
              </Link>
            </>
          ))}
      </div>
    </header>
  );
}
