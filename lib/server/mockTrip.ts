import { addDays, format, parseISO } from "date-fns";
import type { TripInput, TripItinerary } from "@/types/trip";

const dayThemes = [
  "Arrival, icons, and easy orientation",
  "Neighborhoods, food, and local texture",
  "Culture, views, and a memorable evening",
  "Markets, green space, and a slower finish",
  "Hidden gems and flexible discoveries",
];

export function buildMockItinerary(input: TripInput): TripItinerary {
  const days = Array.from({ length: input.days_count }, (_, dayIndex) => {
    const date = input.start_date
      ? format(addDays(parseISO(input.start_date), dayIndex), "yyyy-MM-dd")
      : null;
    const label = input.destination_text;
    const relaxed = input.pace === "relaxed";
    const packed = input.pace === "packed";
    const itemCount = relaxed ? 3 : packed ? 5 : 4;
    const templates = [
      {
        start_time: "09:30",
        end_time: "11:30",
        title: `${label} landmark walk`,
        category: "attraction" as const,
        cost: 0,
      },
      {
        start_time: "12:00",
        end_time: "13:15",
        title: "Local lunch stop",
        category: "restaurant" as const,
        cost: 28,
      },
      {
        start_time: "14:00",
        end_time: "16:00",
        title: input.interests.includes("Museums") ? "Museum-focused afternoon" : "Neighborhood exploring",
        category: input.interests.includes("Museums") ? ("museum" as const) : ("neighborhood" as const),
        cost: 22,
      },
      {
        start_time: "17:00",
        end_time: "18:30",
        title: "Scenic golden-hour stop",
        category: "nature" as const,
        cost: 0,
      },
      {
        start_time: "19:30",
        end_time: "21:00",
        title: "Dinner with a strong local menu",
        category: "restaurant" as const,
        cost: 42,
      },
    ].slice(0, itemCount);

    return {
      day_number: dayIndex + 1,
      date,
      title: dayThemes[dayIndex % dayThemes.length],
      summary: `A ${input.pace} day in ${label} balanced around ${input.interests.slice(0, 3).join(", ") || "classic highlights"}.`,
      weather: {
        available: false,
        condition: null,
        high_temp_c: null,
        low_temp_c: null,
        packing_tip: "Forecast unavailable in mock mode; pack a light layer and comfortable shoes.",
      },
      items: templates.map((item, index) => ({
        start_time: item.start_time,
        end_time: item.end_time,
        title: item.title,
        description:
          "Mock itinerary mode uses plausible planning structure until live API keys are configured. Review details before booking anything.",
        category: item.category,
        place: {
          name: item.title,
          google_place_id: null,
          address: null,
          lat:
            input.destination_lat !== null && input.destination_lat !== undefined
              ? input.destination_lat + (index - 2) * 0.01
              : null,
          lng:
            input.destination_lng !== null && input.destination_lng !== undefined
              ? input.destination_lng + (index - 2) * 0.01
              : null,
          google_maps_url: null,
          source: "ai_estimate" as const,
        },
        estimated_cost: {
          amount: item.cost,
          currency: input.currency,
          confidence: "low" as const,
          note: "Estimate only. Live place pricing is not verified.",
        },
        why_it_fits: `Chosen to match ${input.pace} pacing and interests in ${input.interests.join(", ") || "balanced sightseeing"}.`,
        transit_note: "Grouped to reduce backtracking; verify travel times locally.",
        accessibility_note:
          input.accessibility_needs.length > 0
            ? `Review for: ${input.accessibility_needs.join(", ")}.`
            : null,
        booking_note: "No booking availability has been verified.",
      })),
      backup_options: [
        {
          title: "Cafe reset",
          description: "Swap in a slower indoor break if energy or weather changes.",
          best_if: "The day feels too full.",
          estimated_cost: 15,
        },
      ],
    };
  });

  const perTraveler = input.pace === "packed" ? 120 : input.pace === "relaxed" ? 75 : 95;
  const total = perTraveler * input.days_count * input.travelers;

  return {
    title: `${input.destination_text} in ${input.days_count} days`,
    destination: input.destination_text,
    summary:
      "A polished mock itinerary with day-by-day timing, cost estimates, backup ideas, and clear labeling for unverified suggestions.",
    days_count: input.days_count,
    currency: input.currency,
    estimated_total_cost: total,
    budget_status:
      !input.budget_amount ? "unknown" : total <= input.budget_amount * 0.9 ? "under_budget" : total <= input.budget_amount * 1.1 ? "near_budget" : "over_budget",
    best_for: [input.travel_style, `${input.pace} pacing`, "First-pass planning"],
    neighborhoods: ["Central area", "Local neighborhoods", "Scenic district"],
    travel_tips: [
      "Mock mode is for planning flow and UI review.",
      "Add OpenAI and Google keys for live place-aware generation.",
      "Verify hours, closures, booking availability, and exact prices before travel.",
    ],
    warnings: ["Mock itinerary mode: add API keys for live generation."],
    budget_breakdown: {
      food: Math.round(total * 0.42),
      activities: Math.round(total * 0.28),
      transit: Math.round(total * 0.18),
      miscellaneous: Math.round(total * 0.12),
      notes: "All numbers are planning estimates, not live prices.",
    },
    days,
  };
}
