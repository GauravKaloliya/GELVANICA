"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToastVariant = "default" | "success" | "error" | "warning" | "info" | "loading";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, options?: { duration?: number; action?: Toast["action"] }) => string;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const VARIANT_CONFIG: Record<ToastVariant, { icon: React.ElementType; className: string }> = {
  default: { icon: Info, className: "border-zinc-700 bg-zinc-800 text-white" },
  success: { icon: CheckCircle, className: "border-green-500/20 bg-green-500/10 text-green-400" },
  error: { icon: AlertCircle, className: "border-red-500/20 bg-red-500/10 text-red-400" },
  warning: { icon: AlertTriangle, className: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
  info: { icon: Info, className: "border-blue-500/20 bg-blue-500/10 text-blue-400" },
  loading: { icon: Loader2, className: "border-zinc-700 bg-zinc-800 text-white" },
};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    (message: string, variant: ToastVariant = "default", options?: { duration?: number; action?: Toast["action"] }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = { id, message, variant, ...options };
      setToasts((prev) => [...prev, toast]);
      if (variant !== "loading" && (options?.duration ?? 5000) > 0) {
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), options?.duration ?? 5000);
      }
      return id;
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const config = VARIANT_CONFIG[toast.variant];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-2xl backdrop-blur-sm",
              "animate-in slide-in-from-bottom-5 fade-in-0 duration-300",
              config.className
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                toast.variant === "loading" && "animate-spin"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            {toast.variant !== "loading" && (
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { ToastProvider };
export type { Toast, ToastVariant, ToastContextType };
