/**
 * YP ADMIN · AUTH HELPERS (v1.2)
 *
 * Login navigation utilities — ported from ypwork's login pattern with
 * open-redirect protection and redirect-loop prevention.
 *
 * Key improvements over v1.1:
 * - getSafeRedirect() validates that redirect is a relative path (no //)
 * - wasRecentlyRedirected() prevents auth-redirect loops
 * - clearRedirectMarkers() cleans up loop-prevention state after success
 */

/** localStorage keys used for redirect-loop prevention */
const LAST_LOGIN_REDIRECT_KEY = "yp-admin:last-login-redirect";
const LAST_AUTH_REDIRECT_KEY = "yp-admin:last-auth-redirect";
const REDIRECT_LOOP_WINDOW_MS = 2000;

/**
 * Read the `redirect` query param from the current URL and validate it.
 * Only allows relative paths starting with "/" but not "//" (open-redirect
 * protection). Falls back to fallbackPath if missing or invalid.
 */
export function getSafeRedirect(fallbackPath = "/dashboard"): string {
  if (typeof window === "undefined") return fallbackPath;
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect) return fallbackPath;
  // Allow only relative paths — block //, /\, and protocol-relative URLs
  if (redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.startsWith("/\\")) {
    return redirect;
  }
  return fallbackPath;
}

/**
 * Check if we were recently redirected to /login — if so, we may be in a
 * redirect loop (e.g., session is invalid immediately after login).
 * Returns true if a loop is detected.
 */
export function wasRecentlyRedirected(): boolean {
  if (typeof window === "undefined") return false;
  const last = parseInt(
    localStorage.getItem(LAST_LOGIN_REDIRECT_KEY) || "0",
    10
  );
  return Date.now() - last < REDIRECT_LOOP_WINDOW_MS;
}

/**
 * Record that we just redirected to login (for loop detection).
 */
export function markLoginRedirect(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_LOGIN_REDIRECT_KEY, String(Date.now()));
}

/**
 * Clear all redirect-loop markers — call this after a successful login.
 */
export function clearRedirectMarkers(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_LOGIN_REDIRECT_KEY);
  localStorage.removeItem(LAST_AUTH_REDIRECT_KEY);
}
