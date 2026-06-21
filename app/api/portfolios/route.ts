import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { Portfolio, PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";

interface PortfolioRow {
  id: string;
  name: string;
  companies: PortfolioCompany[] | null;
  created_at: string;
}

function toPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    name: row.name,
    companies: row.companies ?? [],
    createdAt: row.created_at,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** List the signed-in user's portfolios. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("portfolios")
    .select("id, name, companies, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Could not load portfolios." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    portfolios: (data as PortfolioRow[]).map(toPortfolio),
  });
}

/** Create a portfolio from a name + a list of companies (unscored). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { name?: unknown; companies?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = str(body.name) || "Untitled portfolio";
  const rawCompanies = Array.isArray(body.companies) ? body.companies : [];

  // A company needs a name. A description is optional: if it's missing, the
  // company is web-enriched at scoring time (paste-a-list-of-names flow).
  const companies: PortfolioCompany[] = rawCompanies
    .map((c): PortfolioCompany | null => {
      const obj = (c ?? {}) as Record<string, unknown>;
      const cname = str(obj.name);
      if (!cname) return null;
      const description = str(obj.description) ?? "";
      const website = str(obj.website);
      return {
        id: randomUUID(),
        name: cname,
        description,
        sector: str(obj.sector),
        stage: str(obj.stage),
        geography: str(obj.geography),
        website,
        profileSource: description.length >= 10 ? "manual" : "web",
        exitType: null,
        exitNote: null,
        score: null,
        scoredAt: null,
      };
    })
    .filter((c): c is PortfolioCompany => c !== null)
    .slice(0, 50);

  if (companies.length === 0) {
    return NextResponse.json(
      { error: "Add at least one company with a name." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("portfolios")
    .insert({ user_id: user.id, name, companies })
    .select("id, name, companies, created_at")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "Could not create portfolio." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { portfolio: toPortfolio(data as PortfolioRow) },
    { status: 201 },
  );
}
