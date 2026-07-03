"use client";

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

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: no-op (avoids crash when used outside provider)
    return { toast: () => {} };
  }
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckIcon size={16} />,
  error: <AlertIcon size={16} />,
  info: <InfoIcon size={16} />,
};

export function Toaster() {
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

  // Expose toast via context — but Toaster itself is the provider
  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastConsumer />
      {mounted &&
        createPortal(
          <div className="toast-stack">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast toast--${t.type} ${t.leaving ? "is-leaving" : ""}`}
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

/** Empty consumer — exists so that children can useToast() within the provider tree. */
function ToastConsumer() {
  return null;
}

/**
 * Hook to programmatically show a toast from anywhere within the Toaster tree.
 * Usage:
 *   const { toast } = useToast();
 *   toast("บันทึกสำเร็จ", "success");
 */
export { ToastContext };
