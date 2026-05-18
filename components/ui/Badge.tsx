import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variants = {
  default: "border-slate-300/20 bg-slate-200/10 text-slate-200",
  success: "border-emerald-300/25 bg-emerald-400/[0.12] text-emerald-100",
  warning: "border-amber-300/25 bg-amber-400/[0.12] text-amber-100",
  danger: "border-rose-300/25 bg-rose-400/[0.12] text-rose-100",
  info: "border-cyan-300/25 bg-cyan-400/[0.12] text-cyan-100",
  glass: "border-white/[0.15] bg-white/[0.08] text-slate-100",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
