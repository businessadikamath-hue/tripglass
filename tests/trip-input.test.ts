import { describe, expect, it } from "vitest";
import { tripInputSchema } from "@/lib/validation/tripInput";

describe("trip input validation", () => {
  it("rejects trips longer than the MVP limit", () => {
    const result = tripInputSchema.safeParse({
      destination_text: "Rome",
      days_count: 30,
      currency: "USD",
      travelers: 1,
      pace: "balanced",
      travel_style: "Solo",
      interests: [],
      food_preferences: [],
      accessibility_needs: [],
      must_see: [],
      avoid: [],
    });

    expect(result.success).toBe(false);
  });
});
