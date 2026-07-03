"use client";

/**
 * Auth context — exposes the current SessionUser to the entire app.
 *
 * On mount, fetches the user via Supabase. Re-fetches on auth state change.
 * Redirects to /login if no admin session.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types/database";
import { getBrowserClient } from "@/lib/supabase/client";
import { getCurrentSessionUser } from "@/lib/auth/login";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = getBrowserClient();
    const sessionUser = await getCurrentSessionUser(supabase);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(async () => {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      const supabase = getBrowserClient();

      // Safety timeout — if Supabase is unreachable, stop loading after 5s
      // and let the page render (user will see login redirect or empty state).
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn("[auth] Supabase check timed out — proceeding without session");
          setLoading(false);
        }
      }, 5000);

      try {
        const sessionUser = await getCurrentSessionUser(supabase);
        if (!mounted) return;
        clearTimeout(timeoutId);
        timeoutId = null;
        setUser(sessionUser);
        setLoading(false);

        // Listen for auth state changes
        const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
          if (event === "SIGNED_OUT") {
            if (mounted) {
              setUser(null);
              router.replace("/login");
            }
          } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            try {
              const u = await getCurrentSessionUser(supabase);
              if (mounted) setUser(u);
            } catch (e) {
              console.error("[auth] refresh failed", e);
            }
          }
        });

        return () => {
          sub.subscription.unsubscribe();
        };
      } catch (e) {
        console.error("[auth] init failed", e);
        if (mounted) {
          clearTimeout(timeoutId);
          timeoutId = null;
          setLoading(false);
          // Stay on current page — page-level guards will handle redirect
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]);

  // Redirect to /login if not authenticated and not already there
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
