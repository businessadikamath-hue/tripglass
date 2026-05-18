import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Input({ label, helperText, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          "glass-input min-h-12 w-full rounded-2xl px-4 text-sm placeholder:text-slate-500",
          error ? "border-rose-300/70 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" : "",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-rose-200">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-slate-400">{helperText}</span>
      ) : null}
    </label>
  );
}
