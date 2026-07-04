import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PortfolioCompany } from "@/lib/types";
import Header from "@/app/components/Header";
import DeadlinesRollup, {
  type RollupItem,
} from "@/app/components/DeadlinesRollup";

export const runtime = "nodejs";

interface PortfolioRow {
  id: string;
  name: string;
  companies: PortfolioCompany[] | null;
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("portfolios")
    .select("id, name, companies")
    .order("created_at", { ascending: false });
  const portfolios = ((data as PortfolioRow[]) ?? []);

  // Roll up every dated item across all portfolios' scored companies, the
  // same program merged into one row listing every affected company.
  const today = new Date().toISOString().slice(0, 10);
  const byId = new Map<string, RollupItem>();
  for (const p of portfolios) {
    for (const c of p.companies ?? []) {
      for (const o of c.score?.opportunities ?? []) {
        if (!o.deadline || o.deadline < today) continue;
        const existing = byId.get(o.id);
        const holder = { company: c.name, portfolio: p.name, portfolioId: p.id };
        if (existing) {
          if (!existing.holders.some((h) => h.company === c.name && h.portfolioId === p.id)) {
            existing.holders.push(holder);
          }
        } else {
          byId.set(o.id, { opp: o, holders: [holder] });
        }
      }
    }
  }
  const items = [...byId.values()].sort((a, b) =>
    a.opp.deadline!.localeCompare(b.opp.deadline!),
  );

  return (
    <main className="page">
      <Header />
      <section className="glass-card intro-card">
        <h2 className="section-title">Upcoming deadlines</h2>
        <p className="intro-text">
          Every dated deadline across your portfolios — grant applications and
          comment periods matched to your companies, soonest first. Score a
          portfolio to populate it.
        </p>
      </section>

      {portfolios.length === 0 ? (
        <p className="empty">
          No portfolios yet. <Link href="/">Create one</Link> and its deadlines
          will roll up here.
        </p>
      ) : items.length === 0 ? (
        <p className="empty">
          No upcoming dated deadlines across your portfolios yet. Open a
          portfolio and score (or re-score) its companies to populate this.
        </p>
      ) : (
        <DeadlinesRollup
          items={items}
          portfolios={portfolios.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}

      <p className="disclaimer">
        Dates are pulled directly from each official source and link back to it.
        Always confirm a deadline against the linked source before acting —
        comment periods and solicitations can be amended.
      </p>
    </main>
  );
}
