import { NextResponse } from "next/server";
import { matchCompany } from "@/lib/match";

export const runtime = "nodejs";
export const maxDuration = 60;

// Abort the model call a few seconds before Vercel's hard function-duration cap
// so we can send the client a graceful error instead of being killed mid-stream
// (which surfaces as an opaque 504 "took too long").
const ANALYSIS_TIMEOUT_MS = 52_000;

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

  const trimmed = description.trim();
  const encoder = new TextEncoder();

  // Stream newline-delimited JSON. Periodic heartbeats keep the connection
  // active so proxies don't idle-cut a long-running analysis, and let the
  // client show live progress instead of a frozen spinner.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const heartbeat = setInterval(() => {
        try {
          send({ t: "progress" });
        } catch {
          // controller already closed
        }
      }, 4000);

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), ANALYSIS_TIMEOUT_MS);

      try {
        const { matches, followUps } = await matchCompany(trimmed, {
          signal: ac.signal,
        });
        send({ t: "done", matches, followUps });
      } catch (err) {
        const timedOut = ac.signal.aborted;
        console.error("match error:", timedOut ? "timed out" : err);
        send({
          t: "error",
          error: timedOut
            ? "The analysis took too long this time. Please try again — shorter descriptions are usually faster."
            : "Something went wrong while analyzing your company. Please try again.",
        });
      } finally {
        clearTimeout(timeout);
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
