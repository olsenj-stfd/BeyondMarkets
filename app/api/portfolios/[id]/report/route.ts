import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPortfolioReport } from "@/lib/portfolio-report";
import type { PortfolioCompany } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Email the signed-in user a rolled-up report of one of their portfolios.
 * Sends via Resend's REST API (RESEND_API_KEY; REPORT_FROM_EMAIL optional —
 * defaults to Resend's onboarding sender, which only delivers to the Resend
 * account owner's address until a domain is verified).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Email isn't configured yet — add RESEND_API_KEY (free at resend.com) to enable reports.",
      },
      { status: 501 },
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
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
      { error: "Score the portfolio first — there's nothing to report yet." },
      { status: 409 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/portfolios/${portfolio.id}`
    : `https://theregscout.com/portfolios/${portfolio.id}`;
  const { subject, html } = buildPortfolioReport(
    portfolio.name,
    companies,
    appUrl,
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.REPORT_FROM_EMAIL ?? "RegScout <onboarding@resend.dev>",
      to: [user.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("report email error:", res.status, detail.slice(0, 500));
    return NextResponse.json(
      {
        error:
          res.status === 403 && /verify a domain|testing emails/i.test(detail)
            ? "The email service can only send to the Resend account owner until a domain is verified."
            : "Could not send the report email. Please try again.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sentTo: user.email });
}
