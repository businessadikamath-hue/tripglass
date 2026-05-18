import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <GlassCard className="flex flex-col items-center gap-4 p-10 text-center">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{description}</p>
      </div>
      {action}
    </GlassCard>
  );
}
