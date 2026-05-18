import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Array<{ label: string; value: string }>;
  error?: string;
};

export function Select({ label, options, error, className, id, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <select
        id={inputId}
        className={cn(
          "glass-input min-h-12 w-full rounded-2xl px-4 text-sm text-slate-100",
          error ? "border-rose-300/70" : "",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-950">
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </label>
  );
}
