"use client";

/**
 * YP ADMIN · APP LAYOUT (v1.2)
 *
 * Wraps all authenticated pages with AuthProvider + AppShell.
 * Uses the demo's .loading-screen class for the initial loading state
 * (with proper fade-out animation defined in pages.css).
 *
 * Route meta is computed inline (replaces the demo's route-meta.js).
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider, useAuth } from "@/components/framework/auth-provider";
import type { SessionUser } from "@/lib/types/database";

const ROUTE_META: Record<
  string,
  { title: string; activeNav: string | null; showFAB: boolean; showBack: boolean }
> = {
  "/dashboard": { title: "แผงควบคุม", activeNav: "dashboard", showFAB: false, showBack: false },
  "/requests": { title: "คำขอสมัครสมาชิก", activeNav: "requests", showFAB: false, showBack: false },
  "/users": { title: "บัญชีผู้ใช้", activeNav: "users", showFAB: true, showBack: false },
  "/departments": { title: "ฝ่ายงาน", activeNav: "departments", showFAB: true, showBack: false },
  "/years": { title: "ปีการศึกษา", activeNav: "years", showFAB: true, showBack: false },
  "/profile": { title: "โปรไฟล์", activeNav: "profile", showFAB: false, showBack: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // ── Client-side auth guard (backup — middleware handles this server-side) ──
  useEffect(() => {
    if (!loading && !user) {
      // Middleware should have already redirected, but just in case:
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Determine route meta — detail pages (users/[id], departments/[id], requests/[id]) show back button
  const meta = (() => {
    if (pathname.startsWith("/users/")) {
      return { title: "รายละเอียดบัญชี", activeNav: null, showFAB: false, showBack: true };
    }
    if (pathname.startsWith("/departments/")) {
      return { title: "รายละเอียดฝ่าย", activeNav: null, showFAB: false, showBack: true };
    }
    if (pathname.startsWith("/requests/")) {
      return { title: "รายละเอียดคำขอ", activeNav: "requests", showFAB: false, showBack: false };
    }
    return ROUTE_META[pathname] || { title: "YP Admin", activeNav: null, showFAB: false, showBack: false };
  })();

  // FAB click → dispatch event that views can listen for
  const handleFABClick = () => {
    if (pathname === "/departments") {
      window.dispatchEvent(new CustomEvent("ypadmin-fab", { detail: "departments" }));
    } else if (pathname === "/users") {
      window.dispatchEvent(new CustomEvent("ypadmin-fab", { detail: "users" }));
    } else if (pathname === "/years") {
      window.dispatchEvent(new CustomEvent("ypadmin-fab", { detail: "years" }));
    }
  };

  // ── Loading state — uses the demo's .loading-screen class ──
  if (loading) {
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

  // ── No user → redirecting (render nothing, middleware/client-effect handles it) ──
  if (!user) {
    return null;
  }

  return (
    <AppShell
      user={user as SessionUser}
      title={meta.title}
      showFAB={meta.showFAB}
      onFABClick={handleFABClick}
      showBack={meta.showBack}
      activeNav={meta.activeNav}
    >
      {children}
    </AppShell>
  );
}
