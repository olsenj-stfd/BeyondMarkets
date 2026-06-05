import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestProjectName } from "@/lib/match";
import type {
  Consideration,
  EnrichedMatch,
  FollowUp,
  LiveRegResult,
  Project,
} from "@/lib/types";

export const runtime = "nodejs";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  matches: EnrichedMatch[];
  follow_ups: FollowUp[];
  regulations?: LiveRegResult[];
  considerations?: Consideration[];
  created_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    matches: row.matches ?? [],
    followUps: row.follow_ups ?? [],
    regulations: row.regulations ?? [],
    considerations: row.considerations ?? [],
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, matches, follow_ups, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load projects." }, { status: 500 });
  }

  return NextResponse.json({ projects: (data as ProjectRow[]).map(toProject) });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    name?: unknown;
    description?: unknown;
    matches?: unknown;
    followUps?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json(
      { error: "A description is required." },
      { status: 400 },
    );
  }

  // Auto-title: use the caller's name if given, else a best-guess label.
  const provided = typeof body.name === "string" ? body.name.trim() : "";
  const name = provided || (await suggestProjectName(description));

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description,
      matches: Array.isArray(body.matches) ? body.matches : [],
      follow_ups: Array.isArray(body.followUps) ? body.followUps : [],
    })
    .select("id, name, description, matches, follow_ups, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save project." }, { status: 500 });
  }

  return NextResponse.json({ project: toProject(data as ProjectRow) }, { status: 201 });
}
