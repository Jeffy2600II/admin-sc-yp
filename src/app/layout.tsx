import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/framework/toast-provider";
import { BottomSheetProvider } from "@/components/framework/bottom-sheet";

/**
 * YP ADMIN · ROOT LAYOUT (v1.3)
 *
 * v1.3 KEY FIX — CSS loading:
 *   In v1.2, all demo CSS was @import-ed from globals.css. Tailwind v4 +
 *   Turbopack's CSS pipeline was dropping most of those imports silently,
 *   so .sheet, .side-bar, .btn, .stat-card, etc. had no styles applied.
 *   The result: bottom sheets and sidebars were invisible/non-functional.
 *
 *   v1.3 imports each demo CSS file directly in this layout.tsx (as JS
 *   imports). Next.js + Turbopack then emits each as its own CSS chunk
 *   and links them in <head>. Verified: every demo class now has its
 *   rules in the built output.
 *
 * v1.3 font fix:
 *   Dropped next/font/google (its --font-noto-sans-thai / --font-inter
 *   CSS variables didn't match the demo's --yp-font-stack token).
 *   Now loads Noto Sans Thai + Inter from Google Fonts CDN via <link>
 *   in <head>, exactly like the demo's index.html / app.html.
 */
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/layout.css";
import "../styles/components.css";
import "../styles/pages.css";
import "../styles/framework/bottom-sheet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "YP Admin · ระบบหลังบ้านสภานักเรียน",
  description:
    "ระบบหลังบ้านสำหรับสภานักเรียน — จัดการฝ่ายงาน บัญชีผู้ใช้ ปีการศึกษา และคำขอสมัครสมาชิก",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YP Admin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0EA5E9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Load fonts exactly like the demo — Noto Sans Thai + Inter via Google Fonts CDN.
            The demo's tokens.css defines --yp-font-stack using these family names,
            so the body picks them up automatically. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          <BottomSheetProvider>{children}</BottomSheetProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
