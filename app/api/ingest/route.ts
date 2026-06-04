import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/run";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Daily ingestion of dated opportunities from public APIs. Triggered by Vercel
 * Cron (which sends `Authorization: Bearer <CRON_SECRET>`). Also accepts a
 * manual `?secret=` for local testing. Gated so only the scheduler can write.
 */
async function handle(req: Request): Promise<Response> {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const report = await runIngest();
    return NextResponse.json(report);
  } catch (err) {
    console.error("ingest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ingestion failed." },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
