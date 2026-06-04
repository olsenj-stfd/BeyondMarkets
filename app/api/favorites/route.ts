import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** List the signed-in user's starred opportunity ids. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("opportunity_favorites")
    .select("opportunity_id");
  if (error) {
    return NextResponse.json({ error: "Could not load favorites." }, { status: 500 });
  }
  return NextResponse.json({
    ids: (data ?? []).map((r) => r.opportunity_id as string),
  });
}

/** Star an opportunity. Body: { opportunityId }. Idempotent. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { opportunityId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const opportunityId =
    typeof body.opportunityId === "string" ? body.opportunityId : "";
  if (!opportunityId) {
    return NextResponse.json({ error: "An opportunityId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("opportunity_favorites")
    .upsert(
      { user_id: user.id, opportunity_id: opportunityId },
      { onConflict: "user_id,opportunity_id" },
    );
  if (error) {
    return NextResponse.json({ error: "Could not save favorite." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Unstar an opportunity. Body: { opportunityId }. */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { opportunityId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const opportunityId =
    typeof body.opportunityId === "string" ? body.opportunityId : "";
  if (!opportunityId) {
    return NextResponse.json({ error: "An opportunityId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("opportunity_favorites")
    .delete()
    .eq("opportunity_id", opportunityId);
  if (error) {
    return NextResponse.json({ error: "Could not remove favorite." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
