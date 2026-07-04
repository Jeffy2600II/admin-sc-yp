"use client";

/**
 * YP ADMIN · BOTTOM SHEET SYSTEM (v1.3 — complete rewrite)
 *
 * This is a faithful port of ypadmin-demo-v1.5 framework/bottom-sheet.js (v7.7).
 *
 * Key v1.3 fixes (vs v1.2):
 * - Uses CSS class `.is-open` on backdrop+sheet to drive visibility/opacity
 *   (matches demo's CSS exactly — no inline style overrides that break specificity)
 * - Backdrop and sheet start in their "hidden" state (CSS default), then get
 *   `.is-open` added on the next frame to trigger the open animation
 * - Sheet starts translated 100% down (CSS default), `.is-open` slides it up
 * - Removed broken inline-style visibility/opacity logic that left sheets
 *   permanently invisible
 * - Refactored SheetPortal to use proper React state for mount/open phases
 * - Body class `yp-sheet-open` / `yp-sheet-popup` toggled on open/close
 *   (matches demo's scroll-lock + popup-mode CSS hooks)
 *
 * Source: demo/assets/js/framework/bottom-sheet.js
 * CSS:    src/styles/framework/bottom-sheet.css (identical to demo)
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const SHEET_BASE_Z = 18000;
const POPUP_MODE_MQ = "(min-width: 768px)";

const DRAG = {
  ACTIVATION_THRESHOLD: 1,
  EDGE_RESISTANCE: 0.35,
  DRAG_CLOSE_RATIO: 0.28,
  FLING_VELOCITY: 500,
  FLING_CLOSE_RATIO: 0.1,
  BACKDROP_UPDATE_INTERVAL: 2,
};

export interface BottomSheetOptions {
  title?: string;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  dismissable?: boolean;
  size?: "auto" | "tall" | "full";
}

export interface SheetController {
  close: (opts?: { skipHistory?: boolean }) => void;
  patch: (newBody: React.ReactNode) => void;
  setTitle: (newTitle: string) => void;
  bodyEl: HTMLDivElement | null;
  footerEl: HTMLDivElement | null;
  backdrop: HTMLDivElement | null;
  sheet: HTMLDivElement | null;
  closed: boolean;
}

interface SheetState {
  id: number;
  options: BottomSheetOptions;
  controller: SheetController;
}

interface BottomSheetContextValue {
  open: (opts: BottomSheetOptions) => SheetController;
  closeAll: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

export function useBottomSheet() {
  const ctx = useContext(BottomSheetContext);
  if (!ctx) {
    throw new Error("useBottomSheet must be used within BottomSheetProvider");
  }
  return ctx;
}

/* ── Scroll lock (count-based, position:fixed technique) ── */
let _lockCount = 0;
let _savedScrollY = 0;
let _savedScrollX = 0;
let _savedHtmlCss = "";
let _savedBodyCss = "";

function lockScroll() {
  _lockCount++;
  if (_lockCount !== 1) return;
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const body = document.body;
  _savedScrollY = window.scrollY || window.pageYOffset || 0;
  _savedScrollX = window.scrollX || window.pageXOffset || 0;
  _savedHtmlCss = html.getAttribute("style") || "";
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

  if (_savedHtmlCss) html.setAttribute("style", _savedHtmlCss);
  else html.removeAttribute("style");
  if (_savedBodyCss) body.setAttribute("style", _savedBodyCss);
  else body.removeAttribute("style");

  html.style.scrollBehavior = "auto";
  window.scrollTo(_savedScrollX, _savedScrollY);
  requestAnimationFrame(() => {
    html.style.scrollBehavior = "";
  });
}

/* ── History stack (browser back button closes top sheet) ── */
const SHEET_MARKER = "__yp_sheet";
let _isHandlingPop = false;
let _sheetStack: Array<{
  id: number;
  onPop: () => void;
  pushedState: boolean;
  closed: boolean;
}> = [];

function registerSheetHistory(id: number, onPop: () => void) {
  const handle = { id, onPop, pushedState: false, closed: false };
  if (typeof window === "undefined") return handle;

  if (!_isHandlingPop) {
    try {
      const state = (window.history.state || {}) as Record<string, unknown>;
      const currentMarkerId = state[SHEET_MARKER] as number | undefined;
      const isStale =
        currentMarkerId !== undefined &&
        !_sheetStack.find((h) => h.id === currentMarkerId);

      if (isStale) {
        const newState = { ...state, [SHEET_MARKER]: id };
        window.history.replaceState(newState, "", window.location.href);
      } else {
        window.history.pushState(
          { ...state, [SHEET_MARKER]: id },
          "",
          window.location.href
        );
      }
      handle.pushedState = true;
    } catch (e) {
      console.warn("[history] pushState failed", e);
    }
  }

  _sheetStack.push(handle);
  return handle;
}

function closeSheetHistory(handle: (typeof _sheetStack)[number]) {
  if (!handle || handle.closed) return;
  if (handle.pushedState && !_isHandlingPop) {
    handle.pushedState = false;
    window.history.back();
  } else {
    removeFromStack(handle);
    handle.onPop?.();
  }
}

function removeFromStack(handle: (typeof _sheetStack)[number]) {
  const idx = _sheetStack.indexOf(handle);
  if (idx !== -1) _sheetStack.splice(idx, 1);
  handle.closed = true;
}

function _onPopState() {
  if (typeof window === "undefined") return;
  const state = (window.history.state || {}) as Record<string, unknown>;
  const topSheet = _sheetStack[_sheetStack.length - 1];

  // If the current state still has a sheet marker, check if it's stale
  // (belongs to a sheet that's no longer in our stack). If so, remove it
  // silently so it doesn't cause phantom back-button presses.
  if (state[SHEET_MARKER]) {
    const markerId = state[SHEET_MARKER] as number;
    const stillOpen = _sheetStack.find((h) => h.id === markerId);
    if (!stillOpen) {
      // Stale marker — replace the state to remove the marker
      try {
        const cleanState = { ...state };
        delete cleanState[SHEET_MARKER];
        window.history.replaceState(cleanState, "", window.location.href);
      } catch (e) {
        // ignore
      }
    }
    return; // still sheet state (or cleaned up)
  }

  // No sheet marker in current state → we navigated back to a non-sheet state
  // Close the topmost sheet if one is still open
  if (topSheet) {
    _isHandlingPop = true;
    removeFromStack(topSheet);
    try {
      topSheet.onPop?.();
    } finally {
      _isHandlingPop = false;
    }
  }
}

function _onKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  const topSheet = _sheetStack[_sheetStack.length - 1];
  if (!topSheet) return;
  e.preventDefault();
  e.stopPropagation();
  closeSheetHistory(topSheet);
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", _onPopState);
  window.addEventListener("keydown", _onKeyDown, true);
}

/* ── Provider ── */
export function BottomSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sheets, setSheets] = useState<SheetState[]>([]);
  const [mounted, setMounted] = useState(false);
  const sheetIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const open = useCallback((opts: BottomSheetOptions): SheetController => {
    const id = ++sheetIdRef.current;
    let controller: SheetController;
    let historyHandle: (typeof _sheetStack)[number] | null = null;

    const closeSheet = (closeOpts?: { skipHistory?: boolean }) => {
      if (controller.closed) return;
      if (closeOpts?.skipHistory) {
        if (historyHandle) removeFromStack(historyHandle);
        doClose();
      } else {
        if (historyHandle) closeSheetHistory(historyHandle);
        else doClose();
      }
    };

    const doClose = () => {
      if (controller.closed) return;
      controller.closed = true;
      // Start close animation by removing .is-open + adding .is-closing
      const sheetEl = controller.sheet;
      const backdropEl = controller.backdrop;
      if (backdropEl) backdropEl.style.pointerEvents = "none";
      if (sheetEl) {
        sheetEl.classList.add("is-closing");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (sheetEl) {
              sheetEl.classList.remove("is-open");
            }
            if (backdropEl) backdropEl.classList.remove("is-open");
          });
        });
      }
      // Remove from React tree after the close animation finishes
      setTimeout(() => {
        setSheets((prev) => prev.filter((s) => s.id !== id));
        unlockScroll();
        if (_sheetStack.length === 0) {
          document.body.classList.remove("yp-sheet-open", "yp-sheet-popup");
        }
        opts.onClose?.();
      }, 360);
    };

    controller = {
      close: closeSheet,
      patch: () => {},
      setTitle: () => {},
      bodyEl: null,
      footerEl: null,
      backdrop: null,
      sheet: null,
      closed: false,
    };

    // Lock scroll + push history
    lockScroll();
    document.body.classList.add("yp-sheet-open");
    if (
      typeof window !== "undefined" &&
      window.matchMedia(POPUP_MODE_MQ).matches
    ) {
      document.body.classList.add("yp-sheet-popup");
    }
    historyHandle = registerSheetHistory(id, () => doClose());

    setSheets((prev) => [...prev, { id, options: opts, controller }]);
    return controller;
  }, []);

  const closeAll = useCallback(() => {
    while (_sheetStack.length > 0) {
      const top = _sheetStack.pop()!;
      top.closed = true;
      top.onPop?.();
    }
    setSheets([]);
    unlockScroll();
    document.body.classList.remove("yp-sheet-open", "yp-sheet-popup");
  }, []);

  return (
    <BottomSheetContext.Provider value={{ open, closeAll }}>
      {children}
      {mounted &&
        createPortal(
          <>
            {sheets.map((s) => (
              <SheetPortal key={s.id} state={s} />
            ))}
          </>,
          document.body
        )}
    </BottomSheetContext.Provider>
  );
}

/* ── Single sheet portal ──
 *
 * v1.3 KEY FIX:
 * - We no longer set inline `visibility` / `opacity` on the backdrop.
 *   Those would override the CSS rules (`.sheet-backdrop.is-open { ... }`)
 *   and break the open animation.
 * - Instead, the sheet portal renders with NO open class initially, then
 *   a double-rAF later we add `.is-open` to both backdrop and sheet.
 *   This lets CSS drive the transition (the demo's approach).
 * - On close we remove `.is-open` and add `.is-closing` (sheet only),
 *   which triggers the slide-down animation. After 360ms we unmount.
 */
function SheetPortal({ state }: { state: SheetState }) {
  const { id, options, controller } = state;
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<any>(null);
  const [openPhase, setOpenPhase] = useState<"hidden" | "open">("hidden");

  // Phase 1: mount (renders with no .is-open). Phase 2: next two rAFs → add .is-open.
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setOpenPhase("open");
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  // Wire controller refs after every render so they're always current
  controller.backdrop = backdropRef.current;
  controller.sheet = sheetRef.current;
  controller.bodyEl = bodyRef.current;
  controller.footerEl = footerRef.current;

  // Wire controller methods that need refs (runs after mount)
  useEffect(() => {
    controller.backdrop = backdropRef.current;
    controller.sheet = sheetRef.current;
    controller.bodyEl = bodyRef.current;
    controller.footerEl = footerRef.current;

    controller.patch = (newBody: React.ReactNode) => {
      // React handles re-render via state in the parent component.
      // For static bodies, callers should close+reopen the sheet.
      void newBody;
    };

    controller.setTitle = (newTitle: string) => {
      if (sheetRef.current) {
        const titleEl = sheetRef.current.querySelector(".sheet__title");
        if (titleEl) titleEl.textContent = newTitle;
      }
      void newTitle;
    };
  }, [controller]);

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && options.dismissable !== false) {
      e.stopPropagation();
      controller.close();
    }
  };

  // Close button
  const handleCloseBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    controller.close();
  };

  /* ── Drag-to-dismiss (pointer events) ── */
  useEffect(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const bodyEl = bodyRef.current;
    if (!sheet || !backdrop || !bodyEl) return;
    if (options.dismissable === false) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia(POPUP_MODE_MQ).matches
    ) {
      return; // No drag in popup mode
    }

    let rafPending = false;
    let frameCounter = 0;

    const isInGripZone = (el: Element | null) => {
      if (!el || !sheet) return false;
      const handle = sheet.querySelector(".sheet__handle");
      const header = sheet.querySelector(".sheet__header");
      return (
        (handle && handle.contains(el)) ||
        (header && header.contains(el))
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (sheet.classList.contains("is-closing")) return;

      const sheetHeight = sheet.offsetHeight;
      const startScrollTop = bodyEl.scrollTop;
      const isGripZone = isInGripZone(e.target as Element);
      const startedAtTop = startScrollTop === 0;

      if (isGripZone || startedAtTop) {
        bodyEl.style.touchAction = "none";
      }

      dragStateRef.current = {
        startY: e.clientY,
        startX: e.clientX,
        startScrollTop,
        startedAtTop,
        isGripZone,
        pointerId: e.pointerId,
        dragY: 0,
        active: false,
        sheetHeight,
        prevMove: null,
        lastMove: { y: e.clientY, t: performance.now() },
        pendingY: e.clientY,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      if (e.touches.length > 1) {
        if (ds.active) resetDragState();
        return;
      }
      const touch = e.touches[0];
      const dy = touch.clientY - ds.startY;
      const canDragDown = ds.isGripZone || ds.startedAtTop;
      if (canDragDown && dy > 0) {
        e.preventDefault();
        return;
      }
      if (ds.active) e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || e.pointerId !== ds.pointerId) return;
      ds.pendingY = e.clientY;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(applyDrag);
    };

    const applyDrag = () => {
      rafPending = false;
      const ds = dragStateRef.current;
      if (!ds) return;
      const clientY = ds.pendingY;
      const dy = clientY - ds.startY;
      const canDragDown = ds.isGripZone || ds.startedAtTop;

      if (canDragDown && dy > 0) {
        if (!ds.active && dy < DRAG.ACTIVATION_THRESHOLD) return;

        if (!ds.active) {
          ds.active = true;
          try {
            sheet.setPointerCapture(ds.pointerId);
          } catch {}
          sheet.classList.add("is-dragging", "is-scroll-locked");
          sheet.classList.remove("is-animating", "is-closing");
          const active = document.activeElement as HTMLElement | null;
          if (active && active !== document.body && typeof active.blur === "function") {
            try {
              active.blur();
            } catch {}
          }
        }

        ds.prevMove = ds.lastMove;
        ds.lastMove = { y: clientY, t: performance.now() };

        const sheetHeight = ds.sheetHeight;
        let dragY: number;
        if (dy <= sheetHeight) {
          dragY = dy;
        } else {
          const overshoot = dy - sheetHeight;
          dragY = sheetHeight + overshoot * DRAG.EDGE_RESISTANCE;
        }
        ds.dragY = dragY;
        sheet.style.transform = `translate3d(0, ${dragY}px, 0)`;

        frameCounter++;
        if (frameCounter >= DRAG.BACKDROP_UPDATE_INTERVAL) {
          frameCounter = 0;
          const dragProgress = Math.min(dragY / sheetHeight, 1);
          backdrop.style.opacity = (1 - dragProgress * 0.55).toString();
        }
        return;
      }

      if (ds.active && dy <= 0) {
        ds.dragY = 0;
        sheet.style.transform = "";
        backdrop.style.opacity = "";
        return;
      }

      if (ds.active) resetDragState();
    };

    const onPointerUp = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || e.pointerId !== ds.pointerId) return;
      dragStateRef.current = null;
      rafPending = false;
      frameCounter = 0;
      bodyEl.style.touchAction = "";
      try {
        sheet.releasePointerCapture(e.pointerId);
      } catch {}
      sheet.classList.remove("is-scroll-locked");
      if (!ds.active) return;

      let velocity = 0;
      if (ds.prevMove && ds.lastMove) {
        const dt = ds.lastMove.t - ds.prevMove.t;
        if (dt > 0) {
          const dy = ds.lastMove.y - ds.prevMove.y;
          velocity = dy / (dt / 1000);
        }
      }

      const sheetHeight = ds.sheetHeight;
      const dragThreshold = sheetHeight * DRAG.DRAG_CLOSE_RATIO;
      const flingThreshold = sheetHeight * DRAG.FLING_CLOSE_RATIO;
      const isFlingDown = velocity > DRAG.FLING_VELOCITY;
      const shouldClose =
        ds.dragY > dragThreshold ||
        (isFlingDown && ds.dragY > flingThreshold);

      sheet.classList.remove("is-dragging");

      if (shouldClose) {
        sheet.classList.add("is-closing");
        requestAnimationFrame(() => {
          sheet.style.transform = `translate3d(0, ${sheetHeight}px, 0)`;
        });
        // v1.4 FIX: Don't skip history — call controller.close() without
        // skipHistory so closeSheetHistory() properly pops the browser's
        // history entry via history.back(). Previously we used
        // { skipHistory: true } which left a stale history entry — after
        // drag-closing, pressing hardware back did nothing visible (the
        // popstate handler saw the stale sheet marker and returned early).
        // Now the history is properly synced.
        setTimeout(() => controller.close(), 200);
      } else {
        sheet.classList.add("is-animating");
        requestAnimationFrame(() => {
          sheet.style.transform = "";
          backdrop.style.opacity = "";
        });
        setTimeout(() => sheet.classList.remove("is-animating"), 500);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || e.pointerId !== ds.pointerId) return;
      resetDragState();
    };

    const resetDragState = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      rafPending = false;
      frameCounter = 0;
      const wasActive = ds.active;
      dragStateRef.current = null;
      bodyEl.style.touchAction = "";
      if (wasActive) {
        sheet.classList.remove("is-dragging", "is-scroll-locked");
        sheet.style.transform = "";
        backdrop.style.opacity = "";
      }
    };

    sheet.addEventListener("pointerdown", onPointerDown);
    sheet.addEventListener("pointermove", onPointerMove);
    sheet.addEventListener("pointerup", onPointerUp);
    sheet.addEventListener("pointercancel", onPointerCancel);
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      sheet.removeEventListener("pointerdown", onPointerDown);
      sheet.removeEventListener("pointermove", onPointerMove);
      sheet.removeEventListener("pointerup", onPointerUp);
      sheet.removeEventListener("pointercancel", onPointerCancel);
      sheet.removeEventListener("touchmove", onTouchMove);
    };
  }, [options.dismissable, controller]);

  const z = SHEET_BASE_Z + id * 10;
  const sizeClass = `sheet--${options.size || "auto"}`;
  const dismissable = options.dismissable !== false;
  const hasFooter = options.footer != null;
  const isOpen = openPhase === "open";

  return (
    <div
      className={`sheet-backdrop ${isOpen ? "is-open" : ""}`}
      ref={backdropRef}
      style={{ "--sheet-z": z } as React.CSSProperties}
      data-sheet-z={z}
      onClick={handleBackdropClick}
    >
      <div
        className={`sheet ${sizeClass} ${isOpen ? "is-open" : ""} ${
          hasFooter ? "has-footer" : ""
        }`}
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={options.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        {options.title ? (
          <div className="sheet__header">
            <h2 className="sheet__title">{options.title}</h2>
            {dismissable && (
              <button
                className="sheet__close"
                type="button"
                aria-label="ปิด"
                onClick={handleCloseBtn}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : null}
        <div className="sheet__body" data-scrollable="true" ref={bodyRef}>
          {options.body}
        </div>
        <div
          className="sheet__footer"
          data-sheet-footer
          ref={footerRef}
          style={hasFooter ? undefined : { display: "none" }}
        >
          {options.footer}
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience wrapper: open a confirm dialog that resolves to boolean.
 */
export function useConfirmSheet() {
  const { open } = useBottomSheet();
  return useCallback(
    (opts: {
      title?: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      danger?: boolean;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;
        const done = (val: boolean) => {
          if (resolved) return;
          resolved = true;
          controller.close();
          resolve(val);
        };

        const footer = (
          <div className="sheet__actions">
            <button
              className="btn btn--ghost btn--block"
              onClick={() => done(false)}
            >
              {opts.cancelText || "ยกเลิก"}
            </button>
            <button
              className={`btn btn--block ${
                opts.danger ? "btn--danger" : "btn--primary"
              }`}
              onClick={() => done(true)}
            >
              {opts.confirmText || "ยืนยัน"}
            </button>
          </div>
        );

        const controller = open({
          title: opts.title || "",
          body: <p className="sheet__message">{opts.message}</p>,
          footer,
          onClose: () => done(false),
        });
      });
    },
    [open]
  );
}
