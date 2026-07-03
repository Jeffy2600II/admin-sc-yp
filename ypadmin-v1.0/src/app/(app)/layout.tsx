"use client";

import { useEffect, useState } from "react";
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

  // Determine route meta — detail pages (users/[id], departments/[id], requests/[id]) show back button
  const meta = (() => {
    // Detail page: /users/[id]
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

  // FAB click → navigate based on route
  const handleFABClick = () => {
    if (pathname === "/departments") {
      // Triggered by DepartmentsView via window event
      window.dispatchEvent(new CustomEvent("ypadmin-fab", { detail: "departments" }));
    } else if (pathname === "/users") {
      window.dispatchEvent(new CustomEvent("ypadmin-fab", { detail: "users" }));
    } else if (pathname === "/years") {
      window.dispatchEvent(new CustomEvent("ypadmin-fab", { detail: "years" }));
    }
  };

  if (loading) {
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
              animation: "yp-pulse 1.6s ease-in-out infinite",
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

  if (!user) {
    // AuthProvider will redirect, render nothing in the meantime
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
