import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGE = 5000;

/**
 * Store a beta tester's feedback. Attributed to the signed-in user when there
 * is one; anonymous submissions are allowed (the login page links here, and
 * someone stuck at login still needs a channel) with an optional reply email.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: { message?: unknown; category?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  if (!message) {
    return NextResponse.json(
      { error: "Please enter some feedback." },
      { status: 400 },
    );
  }
  const category =
    typeof body.category === "string" ? body.category.trim().slice(0, 80) : null;
  const providedEmail =
    typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";

  const { error } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    email: user?.email ?? (providedEmail || null),
    category,
    message,
  });
  if (error) {
    console.error("feedback insert error:", error);
    return NextResponse.json(
      { error: "Could not save your feedback. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
