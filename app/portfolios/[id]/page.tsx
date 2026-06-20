import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioCompany } from "@/lib/types";
import Header from "@/app/components/Header";
import PortfolioBoard from "@/app/components/PortfolioBoard";

export const runtime = "nodejs";

interface Row {
  id: string;
  name: string;
  companies: PortfolioCompany[] | null;
  created_at: string;
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("portfolios")
    .select("id, name, companies, created_at")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const row = data as Row;

  return (
    <main className="page">
      <Header />
      <PortfolioBoard
        portfolioId={row.id}
        name={row.name}
        initialCompanies={row.companies ?? []}
      />
    </main>
  );
}
