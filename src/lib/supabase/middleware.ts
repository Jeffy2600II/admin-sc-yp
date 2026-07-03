import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

/**
 * Refresh Supabase auth session on every request.
 * Call this from middleware.ts to keep cookies fresh.
 *
 * Returns the authenticated user (or null) so middleware can
 * enforce route protection server-side.
 *
 * If env vars are missing (e.g., during local preview without setup),
 * this gracefully skips the session refresh instead of crashing.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful skip if env vars aren't configured
  if (!supabaseUrl || !supabaseKey) {
    return { response, supabase: null, user: null };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() must be called to refresh the session token.
  // We also capture the result so middleware can enforce auth.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    // Ignore auth errors — user stays null, redirect will happen
  }

  return { supabase, response, user };
}
