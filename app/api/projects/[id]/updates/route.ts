import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { ProjectUpdate } from "@/lib/types";

export const runtime = "nodejs";

const MAX_LEN = 2000;

async function loadUpdates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<ProjectUpdate[] | null> {
  const { data } = await supabase
    .from("projects")
    .select("updates")
    .eq("id", id)
    .single();
  if (!data) return null;
  return Array.isArray(data.updates) ? (data.updates as ProjectUpdate[]) : [];
}

// Append a dated update to a project.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "An update note is required." },
      { status: 400 },
    );
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Updates must be ${MAX_LEN} characters or fewer.` },
      { status: 400 },
    );
  }

  const existing = await loadUpdates(supabase, id);
  if (existing === null) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const update: ProjectUpdate = {
    id: randomUUID(),
    body: text,
    createdAt: new Date().toISOString(),
  };
  // Newest first.
  const updates = [update, ...existing];

  const { error } = await supabase
    .from("projects")
    .update({ updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Could not save the update." },
      { status: 500 },
    );
  }

  return NextResponse.json({ update, updates }, { status: 201 });
}

// Remove a single update by its id.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { updateId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updateId = typeof body.updateId === "string" ? body.updateId : "";
  if (!updateId) {
    return NextResponse.json(
      { error: "An update id is required." },
      { status: 400 },
    );
  }

  const existing = await loadUpdates(supabase, id);
  if (existing === null) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const updates = existing.filter((u) => u.id !== updateId);

  const { error } = await supabase
    .from("projects")
    .update({ updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Could not delete the update." },
      { status: 500 },
    );
  }

  return NextResponse.json({ updates });
}
