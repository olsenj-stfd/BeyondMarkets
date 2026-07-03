import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Map an Anthropic API error to an actionable user-facing response, so a
 * billing/key problem never reads as a generic "try again". Returns null for
 * non-Anthropic errors (caller falls through to its own handling).
 */
export function anthropicErrorResponse(err: unknown): NextResponse | null {
  if (!(err instanceof Anthropic.APIError)) return null;
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
