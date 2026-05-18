import type { TripItinerary } from "@/types/trip";

export function getBudgetStatus(
  itinerary: TripItinerary,
  budgetAmount?: number | null,
) {
  if (!budgetAmount || !itinerary.estimated_total_cost) return "unknown";
  const ratio = itinerary.estimated_total_cost / budgetAmount;
  if (ratio <= 0.9) return "under_budget";
  if (ratio <= 1.1) return "near_budget";
  return "over_budget";
}
