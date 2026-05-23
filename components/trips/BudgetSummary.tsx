"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/utils/currency";
import type { TripItinerary } from "@/types/trip";

const labels: Record<string, string> = {
  under_budget: "Under budget",
  near_budget: "Close to budget",
  over_budget: "Over budget",
  unknown: "Budget unknown",
};

export function BudgetSummary({
  itinerary,
  tripId,
  onRevised,
}: {
  itinerary: TripItinerary;
  tripId?: string;
  onRevised?: (itinerary: TripItinerary) => void;
}) {
  const [budgetPrompt, setBudgetPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rawBreakdown = itinerary.budget_breakdown;
  const itemTotals = itinerary.days
    .flatMap((day) => day.items)
    .reduce(
      (totals, item) => {
        const amount = item.estimated_cost.amount ?? 0;
        if (item.category === "hotel") totals.accommodation += amount;
        if (item.category === "restaurant" || item.category === "cafe") totals.food += amount;
        if (item.category === "transport") totals.transit += amount;
        if (
          item.category !== "hotel" &&
          item.category !== "restaurant" &&
          item.category !== "cafe" &&
          item.category !== "transport" &&
          item.category !== "break"
        ) {
          totals.activities += amount;
        }
        if (item.category === "break") totals.miscellaneous += amount;
        return totals;
      },
      { food: 0, accommodation: 0, activities: 0, transit: 0, miscellaneous: 0 },
    );
  const breakdown = {
    food: rawBreakdown.food ?? itemTotals.food,
    accommodation: rawBreakdown.accommodation ?? itemTotals.accommodation,
    activities: rawBreakdown.activities ?? itemTotals.activities,
    transit: rawBreakdown.transit ?? itemTotals.transit,
    miscellaneous: rawBreakdown.miscellaneous ?? itemTotals.miscellaneous,
    notes: rawBreakdown.notes,
  };

  async function reviseBudget() {
    if (!tripId || !budgetPrompt.trim()) return;
    setLoading(true);
    setError("");
    const response = await fetch(`/api/trips/${tripId}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction: `Budget edit request: ${budgetPrompt}. Keep the itinerary practical, update budget_breakdown including food, accommodation, activities, transit, and miscellaneous, item estimated_cost values, budget_status, and notes so category totals are useful.`,
        current_itinerary_json: itinerary,
      }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to update the budget.");
      return;
    }

    onRevised?.(payload.itinerary);
    setBudgetPrompt("");
  }

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
          ["Hotel / lodging", breakdown.accommodation],
          ["Activities", breakdown.activities],
          ["Transit + flights", breakdown.transit],
          ["Misc", breakdown.miscellaneous],
        ].map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between border-b border-white/10 pb-2 text-slate-300">
            <span>{label}</span>
            <span className="font-medium text-slate-100">{formatCurrency(amount as number | null, itinerary.currency)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">{breakdown.notes}</p>
      {tripId ? (
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="mb-2 text-sm font-semibold text-white">Edit budget</p>
          <Textarea
            value={budgetPrompt}
            onChange={(event) => setBudgetPrompt(event.target.value)}
            placeholder="Take $40 away from food and add it to activities..."
            className="min-h-24"
          />
          {error ? <p className="mt-2 text-sm text-rose-100">{error}</p> : null}
          <Button
            onClick={reviseBudget}
            disabled={loading || !budgetPrompt.trim()}
            className="mt-3 w-full"
            variant="secondary"
          >
            {loading ? "Updating budget..." : "Update budget"}
          </Button>
        </div>
      ) : null}
    </GlassCard>
  );
}
