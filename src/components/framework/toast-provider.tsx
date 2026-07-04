"use client";

/**
 * YP ADMIN · TOAST PROVIDER (v1.2 — fixed context bug)
 *
 * v1.2 FIX: Split Toaster into ToastProvider (wraps children with context)
 * and Toaster (renders the toast stack via portal). Previously the provider
 * was a sibling of children, so useToast() in children silently returned
 * a no-op fallback and toasts never displayed.
 *
 * Ported from ypadmin-demo-v1.5 core/ui.js toast system.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, AlertIcon, InfoIcon } from "@/lib/icons";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: no-op (avoids crash when used outside provider, e.g. during SSR)
    return { toast: () => {} };
  }
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckIcon size={16} />,
  error: <AlertIcon size={16} />,
  info: <InfoIcon size={16} />,
};

/**
 * ToastProvider — wraps the app tree and exposes `useToast()` to all children.
 * Must be placed ABOVE any component that calls useToast().
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration = 2400) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

      // Trigger leave transition before removal
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 220);
      }, duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="toast-stack" aria-live="polite" aria-atomic="true">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast toast--${t.type} ${t.leaving ? "is-leaving" : ""}`}
                role="status"
              >
                {ICONS[t.type]}
                <span>{t.message}</span>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

/**
 * Backward-compatible Toaster export — renders nothing now, the portal is
 * handled inside ToastProvider. Kept so existing imports (if any) don't break.
 *
 * @deprecated Use <ToastProvider> directly instead.
 */
export function Toaster() {
  return null;
}

export { ToastContext };
