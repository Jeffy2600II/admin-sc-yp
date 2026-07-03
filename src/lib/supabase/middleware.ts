import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

/**
 * Refresh Supabase auth session on every request.
 * Call this from middleware.ts to keep cookies fresh.
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
    return { response, supabase: null };
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

  // IMPORTANT: getUser() must be called to refresh the session token
  try {
    await supabase.auth.getUser();
  } catch (e) {
    // Ignore auth errors in middleware — pages will handle auth state
  }

  return { supabase, response };
}
