import { z } from "zod";

export const itineraryCategorySchema = z.enum([
  "attraction",
  "restaurant",
  "cafe",
  "museum",
  "nature",
  "shopping",
  "neighborhood",
  "transport",
  "break",
  "nightlife",
  "other",
]);

export const itineraryItemSchema = z.object({
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: itineraryCategorySchema,
  place: z.object({
    name: z.string().nullable(),
    google_place_id: z.string().nullable(),
    address: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    google_maps_url: z.string().url().nullable(),
    source: z.enum(["google_places", "ai_estimate", "user_input"]),
  }),
  estimated_cost: z.object({
    amount: z.number().nonnegative().nullable(),
    currency: z.string().min(3).max(3),
    confidence: z.enum(["low", "medium", "high"]),
    note: z.string(),
  }),
  why_it_fits: z.string().min(1),
  transit_note: z.string().nullable(),
  accessibility_note: z.string().nullable(),
  booking_note: z.string().nullable(),
});

export const backupOptionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  best_if: z.string().min(1),
  estimated_cost: z.number().nonnegative().nullable(),
});

export const itineraryDaySchema = z.object({
  day_number: z.number().int().min(1),
  date: z.string().nullable(),
  title: z.string().min(1),
  summary: z.string().min(1),
  weather: z.object({
    available: z.boolean(),
    condition: z.string().nullable(),
    high_temp_c: z.number().nullable(),
    low_temp_c: z.number().nullable(),
    packing_tip: z.string().nullable(),
  }),
  items: z.array(itineraryItemSchema).min(1),
  backup_options: z.array(backupOptionSchema),
});

export const tripItinerarySchema = z.object({
  title: z.string().min(1),
  destination: z.string().min(1),
  summary: z.string().min(1),
  days_count: z.number().int().min(1).max(21),
  currency: z.string().min(3).max(3),
  estimated_total_cost: z.number().nonnegative().nullable(),
  budget_status: z.enum(["under_budget", "near_budget", "over_budget", "unknown"]),
  best_for: z.array(z.string()),
  neighborhoods: z.array(z.string()),
  travel_tips: z.array(z.string()),
  warnings: z.array(z.string()),
  budget_breakdown: z.object({
    food: z.number().nonnegative().nullable(),
    activities: z.number().nonnegative().nullable(),
    transit: z.number().nonnegative().nullable(),
    miscellaneous: z.number().nonnegative().nullable(),
    notes: z.string(),
  }),
  days: z.array(itineraryDaySchema).min(1).max(21),
});

export type TripItinerarySchema = z.infer<typeof tripItinerarySchema>;
