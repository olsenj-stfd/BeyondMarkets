import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRelevantEvents } from "@/lib/opportunities";
import { scoreCompany } from "@/lib/portfolio";
import { anthropicErrorResponse } from "@/lib/anthropic-error";
import { capMessage, checkRunAllowance, recordRun } from "@/lib/usage";
import type { PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCORE_TIMEOUT_MS = 52_000;

/**
 * Phase 2 of scoring: the synthesis call, cached on the portfolio row.
 * Exactly ONE model call per invocation — enrichment + graph drafting happen
 * in /prepare with their own function window. One company per request; the
 * client walks the portfolio sequentially (concurrent scores would clobber
 * each other's write of the companies array).
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

  const working = companies[idx];
  if (!working.description || working.description.trim().length < 10) {
    return NextResponse.json(
      {
        error: `"${working.name}" has no profile yet — run prepare first (the board does this automatically).`,
      },
      { status: 409 },
    );
  }

  // Beta budget guard: one run = one company scored. Counted here, at the
  // point of the expensive call, so re-runs also count.
  const allowance = await checkRunAllowance(supabase, user.id);
  if (!allowance.allowed && allowance.code) {
    return NextResponse.json(
      { error: capMessage(allowance.code), code: allowance.code },
      { status: 429 },
    );
  }
  await recordRun(supabase, user.id);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), SCORE_TIMEOUT_MS);
  try {
    const opportunities = await getRelevantEvents();
    const score = await scoreCompany(working, opportunities, {
      signal: ac.signal,
    });

    const scoredAt = new Date().toISOString();
    const updated = companies.map((c, i) =>
      i === idx ? { ...working, score, scoredAt } : c,
    );
    await supabase
      .from("portfolios")
      .update({ companies: updated })
      .eq("id", id);

    return NextResponse.json({ company: updated[idx] });
  } catch (err) {
    console.error("portfolio score error:", err);
    if (ac.signal.aborted) {
      return NextResponse.json(
        { error: "Scoring took too long. Please try again." },
        { status: 504 },
      );
    }
    const mapped = anthropicErrorResponse(err);
    if (mapped) return mapped;
    return NextResponse.json(
      { error: "Could not score this company. Please try again." },
      { status: 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
