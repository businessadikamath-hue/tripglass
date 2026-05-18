import { z } from "zod";

const optionalTextArray = z.preprocess((value) => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string()).default([]));

export const tripInputSchema = z
  .object({
    destination_text: z.string().trim().min(2, "Enter a destination."),
    destination_place_id: z.string().nullable().optional(),
    destination_lat: z.number().nullable().optional(),
    destination_lng: z.number().nullable().optional(),
    starting_city: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    days_count: z.coerce.number().int().min(1).max(21),
    budget_amount: z.coerce.number().nonnegative().nullable().optional(),
    currency: z.string().min(3).max(3).default("USD"),
    travelers: z.coerce.number().int().min(1).max(20).default(1),
    pace: z.enum(["relaxed", "balanced", "packed"]).default("balanced"),
    travel_style: z.string().min(1).default("Couple"),
    start_time_preference: z.string().nullable().optional(),
    walking_tolerance: z.string().nullable().optional(),
    interests: optionalTextArray,
    food_preferences: optionalTextArray,
    accessibility_needs: optionalTextArray,
    must_see: optionalTextArray,
    avoid: optionalTextArray,
    notes: z.string().max(1000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.start_date && value.end_date && value.end_date < value.start_date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "End date must be after the start date.",
      });
    }
  });

export const revisionInputSchema = z.object({
  instruction: z.string().trim().min(3).max(1000),
  current_itinerary_json: z.unknown().optional(),
});

export type TripInputSchema = z.infer<typeof tripInputSchema>;
export type TripInputFormValues = z.input<typeof tripInputSchema>;
