import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingOpportunities } from "@/lib/opportunities";
import { scoreCompany } from "@/lib/portfolio";
import { enrichCompany, checkExit } from "@/lib/enrich";
import type { PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCORE_TIMEOUT_MS = 52_000;

/**
 * Score a single company in one of the user's portfolios and cache the result
 * on the portfolio row. One company per request keeps each call well under the
 * Vercel function cap; the client scores a portfolio company-by-company.
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
  const timer = setTimeout(() => ac.abort(), SCORE_TIMEOUT_MS);
  try {
    // Paste-a-list-of-names flow: web-enrich the profile before scoring. The
    // enrichment also checks for an IPO/acquisition/shutdown. For companies we
    // already have a description for, run a dedicated exit check instead.
    let working = companies[idx];
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
      if (!working.description || working.description.trim().length < 10) {
        return NextResponse.json(
          {
            error: `Couldn't find enough about "${working.name}" on the web. Add a short description and re-score.`,
          },
          { status: 422 },
        );
      }
    } else {
      const exit = await checkExit(working.name, working.website, {
        signal: ac.signal,
      });
      working = { ...working, exitType: exit.exitType, exitNote: exit.exitNote };
    }

    const opportunities = await getUpcomingOpportunities();
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
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 500;
      const message =
        status === 429
          ? "Rate limited by the AI service. Wait a moment and try again."
          : status === 401 || status === 403
            ? "The AI service rejected the API key. Check ANTHROPIC_API_KEY."
            : status === 400 && /credit|balance|billing|quota/i.test(err.message)
              ? "The Anthropic account is out of credit. Add billing to continue."
              : status === 529 || status === 503
                ? "The AI service is temporarily overloaded. Please try again."
                : `AI service error (${status}). Please try again.`;
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not score this company. Please try again." },
      { status: 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
