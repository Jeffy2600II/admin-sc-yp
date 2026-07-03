"use client";

/**
 * App shell — top-bar + side-bar + FAB + main content slot.
 * Ported from ypadmin-demo-v1.5 framework/app-shell.js (v1.3 sidebar design).
 */
import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/framework/avatar";
import {
  MenuIcon,
  ArrowLeftIcon,
  PlusIcon,
  CloseIcon,
  LayoutIcon,
  InboxIcon,
  UsersIcon,
  BuildingIcon,
  CalendarIcon,
  UserIcon,
} from "@/lib/icons";
import type { SessionUser } from "@/lib/types/database";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "หน้าแรก",
    icon: <LayoutIcon size={20} />,
    href: "/dashboard",
  },
  {
    key: "requests",
    label: "คำขอสมัคร",
    icon: <InboxIcon size={20} />,
    href: "/requests",
  },
  {
    key: "users",
    label: "บัญชีผู้ใช้",
    icon: <UsersIcon size={20} />,
    href: "/users",
  },
  {
    key: "departments",
    label: "ฝ่ายงาน",
    icon: <BuildingIcon size={20} />,
    href: "/departments",
  },
  {
    key: "years",
    label: "ปีการศึกษา",
    icon: <CalendarIcon size={20} />,
    href: "/years",
  },
  {
    key: "profile",
    label: "โปรไฟล์",
    icon: <UserIcon size={20} />,
    href: "/profile",
  },
];

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  /** Title shown in top bar. */
  title?: string;
  /** Whether to show FAB. */
  showFAB?: boolean;
  /** FAB click handler. */
  onFABClick?: () => void;
  /** Whether to show back button instead of menu (sub-pages). */
  showBack?: boolean;
  /** Active nav key for sidebar highlight. */
  activeNav?: string | null;
  /** Top accent color (e.g., for department/user detail pages). */
  accentColor?: string;
  /** Accent title for sub-pages. */
  accentTitle?: string;
}

export function AppShell({
  user,
  children,
  title = "YP Admin",
  showFAB = false,
  onFABClick,
  showBack = false,
  activeNav = null,
  accentColor,
  accentTitle,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply top accent via CSS variables on the shell root
  const shellStyle: React.CSSProperties = {
    "--yp-top-from": accentColor || "#0EA5E9",
    "--yp-top-to": accentColor
      ? `color-mix(in srgb, ${accentColor} 60%, #06B6D4)`
      : "#06B6D4",
    "--yp-top-accent": accentColor || "#0EA5E9",
  } as React.CSSProperties;

  const displayTitle = accentTitle || title;

  // Lock body scroll when sidebar open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // ESC closes sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="app-shell" style={shellStyle} data-shell>
      <header className="top-bar">
        <div className="top-bar__left">
          {!showBack ? (
            <button
              className="top-bar__menu"
              aria-label="เปิดเมนู"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="top-bar__menu-icon">
                <MenuIcon size={22} />
              </span>
            </button>
          ) : (
            <button
              className="top-bar__back"
              aria-label="ย้อนกลับ"
              type="button"
              onClick={handleBack}
            >
              <ArrowLeftIcon size={20} />
            </button>
          )}
        </div>
        <div className="top-bar__title">{displayTitle}</div>
        <div className="top-bar__right">
          <Link
            href="/profile"
            className="top-bar__avatar"
            aria-label="โปรไฟล์"
            data-no-copy
          >
            <Avatar
              name={user.name}
              color={user.color}
              size={32}
              className="top-bar__avatar-img"
            />
          </Link>
        </div>
      </header>

      <main className="app-main" id="app-main">
        {children}
      </main>

      {showFAB && (
        <button
          className="fab"
          type="button"
          aria-label="เพิ่มใหม่"
          onClick={onFABClick}
        >
          <PlusIcon size={22} />
        </button>
      )}

      {/* Sidebar backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar panel */}
      <aside
        className={`side-bar ${sidebarOpen ? "is-open" : ""}`}
        id="side-bar"
        aria-label="เมนูนำทาง"
        role="dialog"
        aria-modal="false"
      >
        <div className="side-bar__header">
          <div className="side-bar__brand">
            <div className="side-bar__brand-logo">YP</div>
            <div className="side-bar__brand-text">
              <div className="side-bar__brand-name">YP Admin</div>
              <div className="side-bar__brand-tag">ระบบจัดการสภานักเรียน</div>
            </div>
          </div>
          <button
            className="side-bar__close"
            type="button"
            aria-label="ปิดเมนู"
            onClick={() => setSidebarOpen(false)}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="side-bar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`side-bar__item ${isActive ? "is-active" : ""}`}
                data-nav-key={item.key}
              >
                <span className="side-bar__item-icon">{item.icon}</span>
                <span className="side-bar__item-label">{item.label}</span>
                <span className="side-bar__item-indicator" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <div className="side-bar__footer">
          <Link href="/profile" className="side-bar__user">
            <div className="side-bar__user-avatar">
              <Avatar name={user.name} color={user.color} size={40} />
            </div>
            <div className="side-bar__user-info">
              <div className="side-bar__user-name">{user.name}</div>
              <div className="side-bar__user-role">
                {user.roleLabel || "ผู้ดูแลระบบ"}
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </div>
  );
}
