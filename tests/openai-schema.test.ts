import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toOpenAIStructuredSchema } from "@/lib/server/openai";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";

describe("OpenAI structured schema", () => {
  it("strips JSON schema keywords unsupported by structured outputs", () => {
    const schema = toOpenAIStructuredSchema(
      z.toJSONSchema(tripItinerarySchema, { target: "draft-7" }) as Record<
        string,
        unknown
      >,
    );

    const serialized = JSON.stringify(schema);
    expect(serialized).not.toContain("minLength");
    expect(serialized).not.toContain("minimum");
    expect(serialized).not.toContain("format");
    expect(serialized).not.toContain("minItems");
    expect(serialized).toContain("additionalProperties");
  });
});
