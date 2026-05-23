import type { TripItinerary } from "@/types/trip";

export const sampleItinerary: TripItinerary = {
  title: "Paris food and museums",
  destination: "Paris",
  summary: "A practical one-day itinerary with clear timing and estimated costs.",
  days_count: 1,
  currency: "USD",
  estimated_total_cost: 125,
  budget_status: "under_budget",
  best_for: ["Solo", "Food", "Museums"],
  neighborhoods: ["Saint-Germain-des-Pres", "Louvre"],
  travel_tips: ["Verify opening hours before leaving."],
  warnings: ["Watch for pickpockets in crowded areas."],
  budget_breakdown: {
    food: 55,
    accommodation: 0,
    activities: 45,
    transit: 15,
    miscellaneous: 10,
    notes: "All costs are planning estimates.",
  },
  days: [
    {
      day_number: 1,
      date: null,
      title: "Museums, cafes, and central Paris",
      summary: "A walkable day with meals, museums, and breaks.",
      weather: {
        available: false,
        condition: null,
        high_temp_c: null,
        low_temp_c: null,
        packing_tip: null,
      },
      items: [
        {
          start_time: "09:00",
          end_time: "10:30",
          title: "Morning cafe",
          description: "Start with coffee and a simple breakfast.",
          category: "cafe",
          place: {
            name: "Central cafe",
            google_place_id: null,
            address: null,
            lat: 48.8566,
            lng: 2.3522,
            google_maps_url: null,
            source: "ai_estimate",
          },
          estimated_cost: {
            amount: 18,
            currency: "USD",
            confidence: "medium",
            note: "Estimate only.",
          },
          why_it_fits: "Keeps the morning relaxed.",
          transit_note: "Walk from your accommodation if nearby.",
          accessibility_note: null,
          booking_note: null,
        },
      ],
      backup_options: [
        {
          title: "Indoor cafe break",
          description: "Use this if weather changes.",
          best_if: "Rain or low energy.",
          estimated_cost: 12,
        },
      ],
    },
  ],
};
