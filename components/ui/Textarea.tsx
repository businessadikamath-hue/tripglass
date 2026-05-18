import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Textarea({
  label,
  helperText,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <textarea
        id={inputId}
        className={cn(
          "glass-input min-h-28 w-full rounded-2xl px-4 py-3 text-sm placeholder:text-slate-500",
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
