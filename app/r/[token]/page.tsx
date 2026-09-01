import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildPortfolioReportBody } from "@/lib/portfolio-report";
import type { PortfolioCompany } from "@/lib/types";
import PrintReportBar from "@/app/components/PrintReportBar";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public snapshot of a portfolio report. No sign-in required — possession of
 * the unguessable token is the credential. Content is frozen at share time.
 */
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isSupabaseConfigured || !UUID_RE.test(token)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("report_shares")
    .select("portfolio_name, companies, created_at")
    .eq("token", token)
    .single();
  if (!data) notFound();

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theregscout.com";
  const body = buildPortfolioReportBody(
    data.portfolio_name,
    (data.companies ?? []) as PortfolioCompany[],
    appUrl,
    data.created_at,
  );

  return (
    <main className="shared-report">
      <PrintReportBar />
      {/* Trusted server-generated markup (built from our own escaped data). */}
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </main>
  );
}
