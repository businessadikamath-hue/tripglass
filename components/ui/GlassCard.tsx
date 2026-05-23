import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  intensity?: "subtle" | "normal" | "strong";
};

const intensityClass = {
  subtle: "bg-[var(--glass)] shadow-[0_18px_50px_rgba(0,0,0,0.22)]",
  normal: "bg-[var(--glass)] shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
  strong: "bg-[var(--glass)] shadow-[0_30px_90px_rgba(0,0,0,0.44)]",
};

export function GlassCard({
  className,
  intensity = "normal",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--glass-border)] backdrop-blur-2xl",
        intensityClass[intensity],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
