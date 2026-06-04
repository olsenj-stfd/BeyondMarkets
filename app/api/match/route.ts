import { NextResponse } from "next/server";
import { matchCompany } from "@/lib/match";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  let description: unknown;
  try {
    ({ description } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof description !== "string" || description.trim().length < 20) {
    return NextResponse.json(
      { error: "Please describe your company in at least a sentence or two." },
      { status: 400 },
    );
  }

  try {
    const { matches, followUps } = await matchCompany(description.trim());
    return NextResponse.json({ matches, followUps });
  } catch (err) {
    console.error("match error:", err);
    const detail =
      err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? (err as { status: number }).status
        : undefined;
    return NextResponse.json(
      {
        error: "Something went wrong while analyzing your company. Please try again.",
        detail,
        status,
      },
      { status: 502 },
    );
  }
}
