import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated cookies. Without this, server-side reads of the session go stale.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Until Supabase env vars are configured, skip session handling so the
  // rest of the site keeps working.
  if (!isSupabaseConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require sign-in for all page routes. Public exceptions: the login page and
  // auth callbacks. API routes self-guard (they return 401), so we let them
  // through rather than redirecting a fetch to an HTML login page.
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/login" ||
    pathname === "/about" ||
    // Feedback works signed-out too — the login page links to it, and people
    // stuck at login are exactly who should be able to reach it.
    pathname === "/feedback" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    // Shared report snapshots: the unguessable token is the credential.
    pathname.startsWith("/r/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
