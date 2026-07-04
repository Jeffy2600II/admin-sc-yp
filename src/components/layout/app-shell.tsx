"use client";

/**
 * App shell — top-bar + side-bar + FAB + main content slot.
 * Ported from ypadmin-demo-v1.5 framework/app-shell.js (v1.3 sidebar design).
 *
 * v1.3 fixes (vs v1.2):
 * - Title swap animation now only fires when the title actually changes
 *   (previously it fired on every render even if title stayed the same,
 *    causing a subtle flicker on unrelated re-renders)
 * - Sidebar scroll-lock uses the same count-based lockScroll approach as
 *   the demo's scroll-lock.js (position:fixed on body + saved scroll pos),
 *   so re-opening the sidebar after closing doesn't jump the page
 * - Added browser back-button integration: opening the sidebar pushes a
 *   history entry so hardware back closes the sidebar instead of leaving
 *   the app (matches demo's registerSheet pattern)
 * - Body gets `yp-sidebar-open` class (matches demo CSS hooks for hiding FAB)
 * - FAB is hidden via CSS (body.yp-sidebar-open .fab) instead of React state
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/framework/avatar";
import { usePerfController } from "@/components/framework/perf-controller";
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

/* ── Lightweight scroll-lock (matches demo's scroll-lock.js) ──
 * Count-based so multiple locks (sidebar + sheet) don't fight each other. */
let _lockCount = 0;
let _savedScrollY = 0;
let _savedScrollX = 0;
let _savedBodyCss = "";

function lockScroll() {
  _lockCount++;
  if (_lockCount !== 1) return;
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const body = document.body;
  _savedScrollY = window.scrollY || window.pageYOffset || 0;
  _savedScrollX = window.scrollX || window.pageXOffset || 0;
  _savedBodyCss = body.getAttribute("style") || "";

  const scrollbarWidth = window.innerWidth - html.clientWidth;
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  html.style.marginRight = scrollbarWidth > 0 ? scrollbarWidth + "px" : "";

  body.style.position = "fixed";
  body.style.top = "-" + _savedScrollY + "px";
  body.style.left = "0";
  body.style.right = "0";
  body.style.bottom = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
}

function unlockScroll() {
  _lockCount = Math.max(0, _lockCount - 1);
  if (_lockCount !== 0) return;
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const body = document.body;
  if (_savedBodyCss) body.setAttribute("style", _savedBodyCss);
  else body.removeAttribute("style");
  html.style.overflow = "";
  html.style.overscrollBehavior = "";
  html.style.marginRight = "";

  html.style.scrollBehavior = "auto";
  window.scrollTo(_savedScrollX, _savedScrollY);
  requestAnimationFrame(() => {
    html.style.scrollBehavior = "";
  });
}

/* ── Sidebar history integration ──
 * When the sidebar opens, we push a history entry so the hardware back
 * button closes the sidebar instead of leaving the app. */
const SIDEBAR_MARKER = "__yp_sidebar";
let _sidebarOpen = false;
let _sidebarHistoryPushed = false;

function _onPopState() {
  if (typeof window === "undefined") return;
  if (!_sidebarOpen) return;
  // Hardware back was pressed while sidebar was open — close it.
  _sidebarOpen = false;
  _sidebarHistoryPushed = false;
  document.body.classList.remove("yp-sidebar-open");
  unlockScroll();
  // Tell React to update its state
  window.dispatchEvent(new CustomEvent("yp-sidebar-close"));
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", _onPopState);
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
  const titleRef = useRef<HTMLDivElement>(null);
  const prevTitleRef = useRef<string>("");

  // Initialize performance controller (pauses hero animations off-screen)
  usePerfController();

  // Apply top accent via CSS variables on the shell root
  const shellStyle: React.CSSProperties = {
    "--yp-top-from": accentColor || "#0EA5E9",
    "--yp-top-to": accentColor
      ? `color-mix(in srgb, ${accentColor} 60%, #06B6D4)`
      : "#06B6D4",
    "--yp-top-accent": accentColor || "#0EA5E9",
  } as React.CSSProperties;

  const displayTitle = accentTitle || title;

  // ── Title swap animation (matches demo's setTitleWithSwap) ──
  // Only trigger when the title actually changes.
  useEffect(() => {
    const titleEl = titleRef.current;
    if (!titleEl) return;
    if (prevTitleRef.current === displayTitle) return;
    prevTitleRef.current = displayTitle;
    // Remove swapping class, force reflow, then re-add to restart animation
    titleEl.classList.remove("is-swapping");
    void titleEl.offsetWidth; // force reflow
    titleEl.classList.add("is-swapping");
    const timer = setTimeout(() => {
      titleEl.classList.remove("is-swapping");
    }, 360);
    return () => clearTimeout(timer);
  }, [displayTitle]);

  // ── Sidebar open/close with scroll-lock + history ──
  const openSidebar = useCallback(() => {
    if (_sidebarOpen) return;
    _sidebarOpen = true;
    setSidebarOpen(true);
    document.body.classList.add("yp-sidebar-open");
    lockScroll();
    // Push history entry so hardware back closes sidebar
    if (typeof window !== "undefined" && !_sidebarHistoryPushed) {
      try {
        const state = (window.history.state || {}) as Record<string, unknown>;
        if (state[SIDEBAR_MARKER]) {
          // Already a sidebar state in history — replace it
          window.history.replaceState(
            { ...state, [SIDEBAR_MARKER]: true },
            "",
            window.location.href
          );
        } else {
          window.history.pushState(
            { ...state, [SIDEBAR_MARKER]: true },
            "",
            window.location.href
          );
        }
        _sidebarHistoryPushed = true;
      } catch (e) {
        // ignore — back button just won't close sidebar
      }
    }
  }, []);

  const closeSidebar = useCallback(
    (opts?: { skipHistory?: boolean }) => {
      if (!_sidebarOpen) return;
      _sidebarOpen = false;
      setSidebarOpen(false);
      document.body.classList.remove("yp-sidebar-open");
      unlockScroll();
      if (_sidebarHistoryPushed && !opts?.skipHistory) {
        _sidebarHistoryPushed = false;
        try {
          window.history.back();
        } catch (e) {
          // ignore
        }
      } else {
        _sidebarHistoryPushed = false;
      }
    },
    []
  );

  // Listen for hardware-back-triggered close
  useEffect(() => {
    const handler = () => setSidebarOpen(false);
    window.addEventListener("yp-sidebar-close", handler);
    return () =>
      window.removeEventListener("yp-sidebar-close", handler);
  }, []);

  // ESC closes sidebar (matches demo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && _sidebarOpen) {
        closeSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeSidebar]);

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar({ skipHistory: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              onClick={openSidebar}
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
        <div className="top-bar__title" ref={titleRef}>
          {displayTitle}
        </div>
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
              avatarUrl={user.avatarUrl}
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
        onClick={() => closeSidebar()}
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
            onClick={() => closeSidebar()}
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
                onClick={() => {
                  // Defer close so navigation feels responsive (matches demo)
                  setTimeout(() => closeSidebar({ skipHistory: true }), 80);
                }}
              >
                <span className="side-bar__item-icon">{item.icon}</span>
                <span className="side-bar__item-label">{item.label}</span>
                <span className="side-bar__item-indicator" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <div className="side-bar__footer">
          <Link
            href="/profile"
            className="side-bar__user"
            onClick={() => {
              setTimeout(() => closeSidebar({ skipHistory: true }), 80);
            }}
          >
            <div className="side-bar__user-avatar">
              <Avatar name={user.name} color={user.color} size={40} avatarUrl={user.avatarUrl} />
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
