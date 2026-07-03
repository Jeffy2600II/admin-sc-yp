"use client";

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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--yp-gradient-hero)",
        color: "white",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 28,
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.35)",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            fontWeight: 800,
            margin: "0 auto 12px",
          }}
        >
          YP
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>YP Admin</div>
        <div style={{ fontSize: 14, opacity: 0.78, marginTop: 4 }}>
          กำลังเตรียมพื้นที่…
        </div>
      </div>
    </div>
  );
}
