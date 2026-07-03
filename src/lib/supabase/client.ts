import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

/**
 * Browser-side Supabase client (singleton).
 * Uses @supabase/ssr for cookie-based session that survives Next.js refresh.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let _browserClient: ReturnType<typeof createClient> | null = null;

export function getBrowserClient() {
  if (!_browserClient) {
    _browserClient = createClient();
  }
  return _browserClient;
}
