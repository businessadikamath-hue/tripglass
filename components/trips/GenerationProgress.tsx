import { GlassCard } from "@/components/ui/GlassCard";
import { LoadingOrb } from "@/components/ui/LoadingOrb";
import { OperationProgress } from "@/components/ui/OperationProgress";

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
      <OperationProgress steps={steps} estimatedSeconds={42} className="mt-8" />
      <p className="mt-5 text-center text-sm text-slate-400">
        Tip: costs, hours, and availability are labeled carefully unless verified by live integrations.
      </p>
    </GlassCard>
  );
}
