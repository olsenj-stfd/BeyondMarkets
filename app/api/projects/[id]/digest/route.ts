import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webDigest } from "@/lib/web-digest";

export const runtime = "nodejs";
export const maxDuration = 60;

// Abort before Vercel's hard function-duration cap so we return cleanly.
const DIGEST_TIMEOUT_MS = 52_000;

/**
 * Web-research "things to consider" digest for one of the signed-in user's
 * projects, cached on the project row. Runs on its own (not in the analyze
 * request) so web-search latency is isolated from the catalog analysis.
 */
export async function POST(
  _req: Request,
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

  // RLS restricts this to the user's own projects.
  const { data: project } = await supabase
    .from("projects")
    .select("description")
    .eq("id", id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), DIGEST_TIMEOUT_MS);
  try {
    const considerations = await webDigest(project.description, {
      signal: ac.signal,
    });

    await supabase
      .from("projects")
      .update({ considerations, digested_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ considerations });
  } catch (err) {
    const timedOut = ac.signal.aborted;
    console.error("project digest error:", timedOut ? "timed out" : err);
    return NextResponse.json(
      {
        error: timedOut
          ? "The web research took too long this time. Please try again."
          : "Could not research this project. Please try again.",
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
