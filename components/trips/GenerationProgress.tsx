import { CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingOrb } from "@/components/ui/LoadingOrb";

const steps = [
  "Understanding your travel style",
  "Finding great places",
  "Balancing your budget",
  "Organizing your days",
  "Polishing your itinerary",
];

export function GenerationProgress() {
  return (
    <GlassCard className="p-8">
      <LoadingOrb />
      <div className="mt-8 grid gap-3">
        {steps.map((step) => (
          <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-3">
            <CheckCircle2 className="h-4 w-4 text-cyan-100" />
            <span className="text-sm text-slate-200">{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-sm text-slate-400">
        Tip: costs, hours, and availability are labeled carefully unless verified by live integrations.
      </p>
    </GlassCard>
  );
}
