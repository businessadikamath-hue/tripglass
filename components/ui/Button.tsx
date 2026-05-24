"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "glass";
  href?: string;
  children: ReactNode;
  loading?: boolean;
};

const variants = {
  primary:
    "border-white/20 bg-[linear-gradient(135deg,#6366F1,#8B5CF6,#06B6D4)] text-white shadow-[0_18px_45px_rgba(99,102,241,0.28)] hover:shadow-[0_22px_60px_rgba(6,182,212,0.32)]",
  secondary:
    "border-white/[0.16] bg-white/[0.10] text-slate-100 hover:bg-white/[0.15]",
  ghost: "border-transparent bg-transparent text-slate-200 hover:bg-white/[0.10]",
  danger: "border-rose-300/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
  glass: "border-white/[0.16] bg-white/[0.08] text-slate-100 backdrop-blur-xl hover:bg-white/[0.14]",
};

export function Button({
  className,
  variant = "primary",
  href,
  children,
  loading = false,
  ...props
}: ButtonProps) {
  const [navigating, setNavigating] = useState(false);
  const busy = loading || navigating;
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    props.disabled || busy ? "" : "hover:-translate-y-0.5 active:translate-y-0",
    className,
  );

  if (href) {
    const external = href.startsWith("http");
    return (
      <Link
        href={href}
        className={classes}
        onClick={() => {
          if (!external) setNavigating(true);
        }}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        aria-busy={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} aria-busy={busy} {...props}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
