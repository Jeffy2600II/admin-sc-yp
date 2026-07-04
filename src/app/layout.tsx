import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/framework/toast-provider";
import { BottomSheetProvider } from "@/components/framework/bottom-sheet";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
      <body
        className={`${notoSansThai.variable} ${inter.variable} antialiased`}
      >
        <ToastProvider>
          <BottomSheetProvider>
            {children}
          </BottomSheetProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
