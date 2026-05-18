import { describe, expect, it } from "vitest";
import { buildMockItinerary } from "@/lib/server/mockTrip";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";

describe("trip itinerary schema", () => {
  it("accepts the mock itinerary generator output", () => {
    const itinerary = buildMockItinerary({
      destination_text: "Paris",
      days_count: 3,
      currency: "USD",
      travelers: 2,
      pace: "balanced",
      travel_style: "Couple",
      interests: ["Food", "Museums"],
      food_preferences: [],
      accessibility_needs: [],
      must_see: [],
      avoid: [],
    });

    expect(() => tripItinerarySchema.parse(itinerary)).not.toThrow();
    expect(itinerary.days).toHaveLength(3);
  });
});
