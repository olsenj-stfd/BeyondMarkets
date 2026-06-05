import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getFavoriteIds,
  getFavoriteOpportunities,
  getUpcomingOpportunities,
} from "@/lib/opportunities";
import Header from "@/app/components/Header";
import DeadlinesDashboard from "@/app/components/DeadlinesDashboard";

export const runtime = "nodejs";

interface ProjectRow {
  id: string;
  name: string;
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: projectRows }, opportunities, tracked, favoriteIds] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name")
        .order("created_at", { ascending: false }),
      getUpcomingOpportunities(),
      getFavoriteOpportunities(),
      getFavoriteIds(),
    ]);

  const projects = ((projectRows as ProjectRow[]) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <main className="page">
      <Header />
      <section className="glass-card intro-card">
        <h2 className="section-title">Upcoming deadlines</h2>
        <p className="intro-text">
          Real, dated grant deadlines and regulatory comment periods from
          Grants.gov, the California Grants Portal, the Federal Register, and
          Regulations.gov. Pick a saved project to rank them by relevance to
          your venture.
        </p>
      </section>

      <DeadlinesDashboard
        opportunities={opportunities}
        tracked={tracked}
        projects={projects}
        favoriteIds={favoriteIds}
      />

      <p className="disclaimer">
        Dates are pulled directly from each official source and link back to it.
        Always confirm a deadline against the linked source before acting — and
        note that comment periods and solicitations can be amended.
      </p>
    </main>
  );
}
