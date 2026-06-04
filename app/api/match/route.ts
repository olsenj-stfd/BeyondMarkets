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
    const matches = await matchCompany(description.trim());
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("match error:", err);
    return NextResponse.json(
      { error: "Something went wrong while analyzing your company. Please try again." },
      { status: 502 },
    );
  }
}
