import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchCompany } from "@/lib/match";
import { searchRegulations } from "@/lib/reg-search";

export const runtime = "nodejs";
export const maxDuration = 60;

// Abort a few seconds before Vercel's hard function-duration cap so we can
// return a clean error instead of being killed mid-stream.
const ANALYSIS_TIMEOUT_MS = 52_000;

/**
 * Run the catalog analysis (regulations / funding / partners) for one of the
 * signed-in user's projects and cache the result on the project row. Optional
 * `extra` appends refinement context to the description for a sharper pass.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { extra?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }
  const extra = typeof body.extra === "string" ? body.extra.trim() : "";

  // RLS restricts this to the user's own projects.
  const { data: project } = await supabase
    .from("projects")
    .select("description")
    .eq("id", id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const fullText = extra
    ? `${project.description}\n\nAdditional context:\n${extra}`
    : project.description;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), ANALYSIS_TIMEOUT_MS);
  try {
    // Curated grant/partner ranking and live regulatory search run in parallel.
    // searchRegulations never throws (degrades to []), so a transient source
    // outage can't fail the whole analysis.
    const [{ matches, followUps }, regulations] = await Promise.all([
      matchCompany(fullText, { signal: ac.signal }),
      searchRegulations(fullText),
    ]);

    await supabase
      .from("projects")
      .update({ matches, follow_ups: followUps, regulations })
      .eq("id", id);

    return NextResponse.json({ matches, followUps, regulations });
  } catch (err) {
    const timedOut = ac.signal.aborted;
    console.error("project analyze error:", timedOut ? "timed out" : err);
    return NextResponse.json(
      {
        error: timedOut
          ? "The analysis took too long this time. Please try again."
          : "Could not analyze this project. Please try again.",
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
