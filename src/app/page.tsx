"use client";

/**
 * YP ADMIN · ROOT PAGE (v1.2)
 *
 * Redirects to /dashboard if authenticated, /login otherwise.
 * Uses the demo's .loading-screen class for the initial state.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { getCurrentSessionUser } from "@/lib/auth/login";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getBrowserClient();
      const user = await getCurrentSessionUser(supabase);
      if (!mounted) return;
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="loading-screen" style={{ opacity: 1 }}>
      <div className="loading-screen__inner">
        <div className="loading-screen__logo">YP</div>
        <div className="loading-screen__title">YP Admin</div>
        <div className="loading-screen__subtitle">กำลังเตรียมพื้นที่…</div>
      </div>
    </div>
  );
}
