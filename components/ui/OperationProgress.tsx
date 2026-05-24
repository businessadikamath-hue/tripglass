"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function OperationProgress({
  steps,
  active = true,
  estimatedSeconds = 35,
  className,
}: {
  steps: string[];
  active?: boolean;
  estimatedSeconds?: number;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => Math.min(estimatedSeconds * 1000 * 0.96, current + 450));
    }, 450);
    return () => window.clearInterval(timer);
  }, [active, estimatedSeconds]);

  const progress = Math.min(96, Math.round((elapsed / (estimatedSeconds * 1000)) * 100));
  const activeIndex = useMemo(() => {
    if (!steps.length) return 0;
    return Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));
  }, [progress, steps.length]);

  return (
    <div className={cn("rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-300">
        <span className="font-medium text-white">Working on it</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.10]">
        <div
          className="h-full rounded-full bg-[linear-gradient(135deg,#6366F1,#8B5CF6,#06B6D4)] shadow-[0_0_24px_rgba(6,182,212,0.35)] transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => {
          const complete = index < activeIndex;
          const current = index === activeIndex;
          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5 text-sm transition",
                complete || current
                  ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-50"
                  : "border-white/[0.08] bg-white/[0.04] text-slate-400",
              )}
            >
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              ) : current ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-100" />
              ) : (
                <Circle className="h-4 w-4 text-slate-500" />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
