import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EnrichedMatch, ProjectUpdate } from "@/lib/types";
import {
  getFavoriteIds,
  resolveRankedCache,
  type RankCacheEntry,
} from "@/lib/opportunities";
import Header from "@/app/components/Header";
import { ResultBoard } from "@/app/components/Results";
import ProjectDeadlines from "@/app/components/ProjectDeadlines";
import ProjectUpdates from "@/app/components/ProjectUpdates";

export const runtime = "nodejs";

interface Row {
  id: string;
  name: string;
  description: string;
  matches: EnrichedMatch[];
  ranked_opportunities: RankCacheEntry[];
  ranked_at: string | null;
  updates: ProjectUpdate[];
  created_at: string;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("projects")
    .select(
      "id, name, description, matches, ranked_opportunities, ranked_at, updates, created_at",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();
  const project = data as Row;

  const [ranked, favoriteIds] = await Promise.all([
    resolveRankedCache(project.ranked_opportunities ?? []),
    getFavoriteIds(),
  ]);

  return (
    <main className="page">
      <Header />
      <section className="glass-card intro-card">
        <Link href="/projects" className="back-link">
          ← All projects
        </Link>
        <h2 className="section-title">{project.name}</h2>
        <p className="intro-text">{project.description}</p>
        <span className="project-date">
          Saved {new Date(project.created_at).toLocaleDateString()}
        </span>
      </section>

      <section className="glass-card">
        <ProjectUpdates
          projectId={project.id}
          initialUpdates={project.updates ?? []}
        />
      </section>

      <ProjectDeadlines
        projectId={project.id}
        initialRanked={ranked}
        rankedAt={project.ranked_at}
        favoriteIds={favoriteIds}
      />

      <ResultBoard matches={project.matches ?? []} />
    </main>
  );
}
