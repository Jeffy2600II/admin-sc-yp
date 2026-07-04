import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * YP ADMIN · MIDDLEWARE (v1.2)
 *
 * Route protection + auth redirect logic.
 *
 * Behavior:
 * - Protected routes (everything except /login, /, /api/*) → redirect to
 *   /login?redirect=<original> if no session
 * - Already authenticated & visiting /login → redirect to /dashboard
 * - Static assets (_next, icons, manifest, service-worker) bypass middleware
 *
 * The redirect param is preserved so login can redirect back after success.
 * Open-redirect protection is enforced client-side in lib/auth/redirect.ts.
 */
const PUBLIC_PATHS = ["/login", "/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // ── Protected routes: redirect to /login if no session ──
  if (!isPublicPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the originally requested path so login can redirect back
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Already authenticated & visiting /login → redirect to /dashboard ──
  if (pathname === "/login" && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    // Clear the redirect param if present
    dashboardUrl.searchParams.delete("redirect");
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons/ (PWA icons)
     * - manifest.json
     * - service-worker.js
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|service-worker.js).*)",
  ],
};
