import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";

const MAX_COMPANIES = 50;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Append companies to an existing portfolio (unscored; the board queues them). */
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

  let body: { companies?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = Array.isArray(body.companies) ? body.companies : [];
  const additions: PortfolioCompany[] = raw
    .map((c): PortfolioCompany | null => {
      const obj = (c ?? {}) as Record<string, unknown>;
      const name = str(obj.name);
      if (!name) return null;
      const description = str(obj.description);
      return {
        id: randomUUID(),
        name,
        description,
        sector: str(obj.sector) || null,
        stage: str(obj.stage) || null,
        geography: str(obj.geography) || null,
        website: str(obj.website) || null,
        profileSource: description.length >= 10 ? "manual" : "web",
        exitType: null,
        exitNote: null,
        graph: null,
        score: null,
        scoredAt: null,
      };
    })
    .filter((c): c is PortfolioCompany => c !== null);

  if (additions.length === 0) {
    return NextResponse.json(
      { error: "Add at least one company with a name." },
      { status: 400 },
    );
  }

  // RLS restricts this to the user's own portfolios.
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("companies")
    .eq("id", id)
    .single();
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found." }, { status: 404 });
  }

  const existing = (portfolio.companies ?? []) as PortfolioCompany[];
  if (existing.length + additions.length > MAX_COMPANIES) {
    return NextResponse.json(
      {
        error: `A portfolio holds at most ${MAX_COMPANIES} companies (${existing.length} already here).`,
      },
      { status: 400 },
    );
  }

  const updated = [...existing, ...additions];
  const { error } = await supabase
    .from("portfolios")
    .update({ companies: updated })
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Could not add the companies. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    companies: updated,
    addedIds: additions.map((c) => c.id),
  });
}
