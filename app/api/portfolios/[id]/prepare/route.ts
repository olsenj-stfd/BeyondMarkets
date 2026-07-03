import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichCompany } from "@/lib/enrich";
import { draftGraph } from "@/lib/graph";
import { anthropicErrorResponse } from "@/lib/anthropic-error";
import type { PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PREPARE_TIMEOUT_MS = 52_000;

/**
 * Phase 1 of scoring a company: web-enrich the profile (paste-a-name flow)
 * and draft the regulatory graph, persisting both. Split from /score so the
 * enrichment + graph calls and the synthesis call each get their own
 * function window instead of stacking inside one 60s cap.
 * No-ops fast when the company already has a description and graph.
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

  let body: { companyId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  if (!companyId) {
    return NextResponse.json(
      { error: "A companyId is required." },
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

  const companies = (portfolio.companies ?? []) as PortfolioCompany[];
  const idx = companies.findIndex((c) => c.id === companyId);
  if (idx === -1) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PREPARE_TIMEOUT_MS);
  try {
    let working = companies[idx];
    let changed = false;

    // Paste-a-list-of-names flow: web-research the profile (incl. exit check).
    if (!working.description || working.description.trim().length < 10) {
      const profile = await enrichCompany(working.name, working.website, {
        signal: ac.signal,
      });
      working = {
        ...working,
        description: profile.description ?? working.description,
        sector: working.sector ?? profile.sector,
        stage: working.stage ?? profile.stage,
        geography: working.geography ?? profile.geography,
        website: working.website ?? profile.website,
        exitType: profile.exitType,
        exitNote: profile.exitNote,
        profileSource: "web",
      };
      changed = true;
      if (!working.description || working.description.trim().length < 10) {
        return NextResponse.json(
          {
            error: `Couldn't find enough about "${working.name}" on the web. Add a short description and re-score.`,
          },
          { status: 422 },
        );
      }
    }

    // Draft the regulatory graph once; reused on every subsequent score.
    if (!working.graph) {
      working = { ...working, graph: await draftGraph(working, { signal: ac.signal }) };
      changed = true;
    }

    if (changed) {
      const updated = companies.map((c, i) => (i === idx ? working : c));
      await supabase
        .from("portfolios")
        .update({ companies: updated })
        .eq("id", id);
    }

    return NextResponse.json({ company: working });
  } catch (err) {
    console.error("portfolio prepare error:", err);
    if (ac.signal.aborted) {
      return NextResponse.json(
        { error: "Preparing the profile took too long. Please try again." },
        { status: 504 },
      );
    }
    const mapped = anthropicErrorResponse(err);
    if (mapped) return mapped;
    return NextResponse.json(
      { error: "Could not prepare this company. Please try again." },
      { status: 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
