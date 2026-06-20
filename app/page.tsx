import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioCompany } from "@/lib/types";
import Header from "@/app/components/Header";
import NewPortfolioForm from "@/app/components/NewPortfolioForm";

export const runtime = "nodejs";

interface Row {
  id: string;
  name: string;
  companies: PortfolioCompany[] | null;
  created_at: string;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("portfolios")
    .select("id, name, companies, created_at")
    .order("created_at", { ascending: false });

  const portfolios = ((data as Row[]) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    count: (r.companies ?? []).length,
    scored: (r.companies ?? []).filter((c) => c.score).length,
    createdAt: r.created_at,
  }));

  return (
    <main className="page">
      <Header />

      <section className="glass-card intro-card">
        <h2 className="section-title">Portfolio assessment</h2>
        <p className="intro-text">
          Score a whole book of companies on non-dilutive capital within reach,
          regulatory climate, and policy-dependency risk — grounded in real,
          dated programs. Paste a list of names and we&apos;ll research each one,
          upload a CSV, or add them by hand. Assessing a single venture?{" "}
          <Link href="/assess">Quick assessment →</Link>
        </p>
      </section>

      <NewPortfolioForm />

      {portfolios.length > 0 && (
        <section className="portfolio-list">
          {portfolios.map((p) => (
            <Link
              key={p.id}
              href={`/portfolios/${p.id}`}
              className="glass-card portfolio-list-item"
            >
              <div>
                <h3>{p.name}</h3>
                <p className="muted">
                  {p.count} {p.count === 1 ? "company" : "companies"}
                  {p.scored < p.count ? ` · ${p.scored} scored` : " · scored"}
                </p>
              </div>
              <span className="arrow">→</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
