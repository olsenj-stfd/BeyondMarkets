import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Create an immutable public snapshot of a portfolio's report behind an
 * unguessable token, and return the shareable URL. The snapshot copies the
 * companies as they are right now — later re-scores don't change a link
 * that's already been sent.
 */
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

  // RLS restricts this to the user's own portfolios.
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id, name, companies")
    .eq("id", id)
    .single();
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found." }, { status: 404 });
  }

  const companies = (portfolio.companies ?? []) as PortfolioCompany[];
  if (companies.every((c) => !c.score)) {
    return NextResponse.json(
      { error: "Score the portfolio first — there's nothing to share yet." },
      { status: 409 },
    );
  }

  const { data: share, error } = await supabase
    .from("report_shares")
    .insert({
      user_id: user.id,
      portfolio_name: portfolio.name,
      companies,
    })
    .select("token")
    .single();
  if (error || !share) {
    const missingTable = error && /report_shares|relation/i.test(error.message);
    return NextResponse.json(
      {
        error: missingTable
          ? "Sharing isn't set up yet — re-run schema.sql in Supabase to add the report_shares table."
          : "Could not create the share link. Please try again.",
      },
      { status: 500 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/r/${share.token}` });
}
