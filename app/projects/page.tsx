import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/app/components/Header";
import ProjectsList from "@/app/components/ProjectsList";

export const runtime = "nodejs";

interface Row {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  const projects = ((data as Row[]) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
  }));

  return (
    <main className="page">
      <Header />
      <section className="glass-card intro-card">
        <h2 className="section-title">Saved projects</h2>
        <p className="intro-text">
          Your saved analyses. Open one to revisit its regulations, grants, and
          partners.
        </p>
      </section>
      <ProjectsList projects={projects} />
    </main>
  );
}
