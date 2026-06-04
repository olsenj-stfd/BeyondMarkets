import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  EnrichedMatch,
  FollowUp,
  Project,
  ProjectUpdate,
} from "@/lib/types";

export const runtime = "nodejs";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  matches: EnrichedMatch[];
  follow_ups: FollowUp[];
  updates: ProjectUpdate[];
  created_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    matches: row.matches ?? [],
    followUps: row.follow_ups ?? [],
    updates: row.updates ?? [],
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
    .select("id, name, description, matches, follow_ups, updates, created_at")
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!name || !description) {
    return NextResponse.json(
      { error: "A name and description are required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description,
      matches: Array.isArray(body.matches) ? body.matches : [],
      follow_ups: Array.isArray(body.followUps) ? body.followUps : [],
    })
    .select("id, name, description, matches, follow_ups, updates, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save project." }, { status: 500 });
  }

  return NextResponse.json({ project: toProject(data as ProjectRow) }, { status: 201 });
}
