import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/lib/utils/currency";
import type { TripItinerary } from "@/types/trip";

const labels: Record<string, string> = {
  under_budget: "Under budget",
  near_budget: "Close to budget",
  over_budget: "Over budget",
  unknown: "Budget unknown",
};

export function BudgetSummary({ itinerary }: { itinerary: TripItinerary }) {
  const breakdown = itinerary.budget_breakdown;
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Budget</h2>
        <Badge variant={itinerary.budget_status === "over_budget" ? "warning" : "success"}>
          {labels[itinerary.budget_status]}
        </Badge>
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">
        {formatCurrency(itinerary.estimated_total_cost, itinerary.currency)}
      </p>
      <div className="mt-5 grid gap-3 text-sm">
        {[
          ["Food", breakdown.food],
          ["Activities", breakdown.activities],
          ["Transit", breakdown.transit],
          ["Misc", breakdown.miscellaneous],
        ].map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between border-b border-white/10 pb-2 text-slate-300">
            <span>{label}</span>
            <span className="font-medium text-slate-100">{formatCurrency(amount as number | null, itinerary.currency)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">{breakdown.notes}</p>
    </GlassCard>
  );
}
