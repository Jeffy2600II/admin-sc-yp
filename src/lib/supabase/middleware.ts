import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

/**
 * YP ADMIN · SUPABASE MIDDLEWARE (v1.2)
 *
 * Refreshes the Supabase auth session on every request and returns the
 * authenticated user (or null) so middleware.ts can enforce route protection.
 *
 * v1.2 improvements (ported from ypwork pattern):
 * - Supports both NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) and
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel × Supabase integration)
 * - Supports both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL env var names
 * - Throws a clear error if env vars are missing (instead of silent failure)
 * - Graceful skip if env vars are not configured (for local preview)
 */

function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is not set. Please connect Supabase × Vercel integration or set the env var manually."
    );
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Supabase anon/publishable key is not set. Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Vercel integration) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)."
    );
  }
  return key;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  let supabaseUrl: string;
  let supabaseKey: string;
  try {
    supabaseUrl = getSupabaseUrl();
    supabaseKey = getSupabaseAnonKey();
  } catch (e) {
    // Env vars not configured — graceful skip (e.g. local preview without setup)
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
