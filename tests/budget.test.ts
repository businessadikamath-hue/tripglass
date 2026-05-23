import { describe, expect, it } from "vitest";
import { getBudgetStatus } from "@/lib/utils/costs";
import { sampleItinerary } from "@/tests/fixtures";

describe("budget helpers", () => {
  it("marks over-budget plans clearly", () => {
    expect(getBudgetStatus(sampleItinerary, 50)).toBe("over_budget");
  });
});
