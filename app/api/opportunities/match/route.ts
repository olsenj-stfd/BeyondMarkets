import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingOpportunities } from "@/lib/opportunities";
import { rankOpportunities } from "@/lib/match-opportunities";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Rank upcoming opportunities against one of the signed-in user's projects. */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { projectId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) {
    return NextResponse.json({ error: "A projectId is required." }, { status: 400 });
  }

  // RLS restricts this to the user's own projects.
  const { data: project } = await supabase
    .from("projects")
    .select("description")
    .eq("id", projectId)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const opportunities = await getUpcomingOpportunities();
    const ranked = await rankOpportunities(project.description, opportunities);

    // Cache the ranking on the project so revisits render instantly.
    await supabase
      .from("projects")
      .update({
        ranked_opportunities: ranked.map((r) => ({
          id: r.id,
          relevance: r.relevance,
          whyRelevant: r.whyRelevant,
        })),
        ranked_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    return NextResponse.json({ ranked });
  } catch (err) {
    console.error("opportunity match error:", err);

    // Surface the real cause so the user (and we) can tell a transient blip
    // from a billing/key problem, instead of an opaque "try again".
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 500;
      const message =
        status === 429
          ? "Rate limited by the AI service. Wait a moment and try again."
          : status === 401 || status === 403
            ? "The AI service rejected the API key. Check ANTHROPIC_API_KEY."
            : status === 400 &&
                /credit|balance|billing|quota/i.test(err.message)
              ? "The Anthropic account is out of credit. Add billing to continue."
              : status === 529 || status === 503
                ? "The AI service is temporarily overloaded. Please try again."
                : `AI service error (${status}). Please try again.`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json(
      { error: "Could not rank opportunities. Please try again." },
      { status: 500 },
    );
  }
}
