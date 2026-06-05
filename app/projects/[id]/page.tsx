import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EnrichedMatch, FollowUp, LiveRegResult } from "@/lib/types";
import {
  getFavoriteIds,
  resolveRankedCache,
  type RankCacheEntry,
} from "@/lib/opportunities";
import Header from "@/app/components/Header";
import ProjectAnalysis from "@/app/components/ProjectAnalysis";
import ProjectDeadlines from "@/app/components/ProjectDeadlines";

export const runtime = "nodejs";

interface Row {
  id: string;
  name: string;
  description: string;
  matches: EnrichedMatch[];
  follow_ups: FollowUp[];
  regulations: LiveRegResult[];
  ranked_opportunities: RankCacheEntry[];
  ranked_at: string | null;
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

  const baseCols =
    "id, name, description, matches, follow_ups, ranked_opportunities, ranked_at, created_at";

  // Select the live-regulations cache, but degrade gracefully if that column
  // hasn't been migrated yet (otherwise a missing column would null the whole
  // row and 404 the page).
  let { data, error } = await supabase
    .from("projects")
    .select(`${baseCols}, regulations`)
    .eq("id", id)
    .single();
  if (error) {
    ({ data } = await supabase
      .from("projects")
      .select(baseCols)
      .eq("id", id)
      .single());
  }

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

      <ProjectDeadlines
        projectId={project.id}
        initialRanked={ranked}
        rankedAt={project.ranked_at}
        favoriteIds={favoriteIds}
      />

      <ProjectAnalysis
        projectId={project.id}
        initialMatches={project.matches ?? []}
        initialFollowUps={project.follow_ups ?? []}
        initialRegulations={project.regulations ?? []}
      />
    </main>
  );
}
