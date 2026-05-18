"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Toast = { id: number; message: string; type: "success" | "error" };
const ToastContext = createContext<{ push: (message: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const value = useMemo(
    () => ({
      push(message: string, type: Toast["type"] = "success") {
        const id = Date.now();
        setToasts((current) => [...current, { id, message, type }]);
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-2xl",
              toast.type === "success"
                ? "border-emerald-300/25 bg-emerald-500/15 text-emerald-50"
                : "border-rose-300/25 bg-rose-500/15 text-rose-50",
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) return { push: () => undefined };
  return context;
}
