import { describe, expect, it } from "vitest";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";
import { sampleItinerary } from "@/tests/fixtures";

describe("trip itinerary schema", () => {
  it("accepts a production-shaped itinerary", () => {
    expect(() => tripItinerarySchema.parse(sampleItinerary)).not.toThrow();
    expect(sampleItinerary.days[0].items[0].start_time).toBe("09:00");
  });
});
