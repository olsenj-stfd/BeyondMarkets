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
        <h2 className="section-title">
          See what&apos;s coming for the organizations you fund
        </h2>
        <p className="intro-text">
          Paste a list of grantees. RegScout researches each one, matches it
          to open funding, and flags the rules and bills still on the horizon.
          Every date links to the official record.
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
                  {p.count} {p.count === 1 ? "organization" : "organizations"}
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
