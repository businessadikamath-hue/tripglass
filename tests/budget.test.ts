import { describe, expect, it } from "vitest";
import { buildMockItinerary } from "@/lib/server/mockTrip";
import { getBudgetStatus } from "@/lib/utils/costs";

describe("budget helpers", () => {
  it("marks over-budget plans clearly", () => {
    const itinerary = buildMockItinerary({
      destination_text: "Tokyo",
      days_count: 5,
      currency: "USD",
      travelers: 2,
      pace: "packed",
      travel_style: "Friends",
      interests: [],
      food_preferences: [],
      accessibility_needs: [],
      must_see: [],
      avoid: [],
    });

    expect(getBudgetStatus(itinerary, 100)).toBe("over_budget");
  });
});
