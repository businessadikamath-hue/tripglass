import OpenAI from "openai";
import { z } from "zod";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";
import type { NormalizedPlace } from "@/types/places";
import type { TripInput, TripItinerary } from "@/types/trip";
import type { DailyWeather } from "@/types/weather";

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
}

const unsupportedSchemaKeys = new Set([
  "$schema",
  "format",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "pattern",
]);

export function toOpenAIStructuredSchema(schema: Record<string, unknown>) {
  function clean(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !unsupportedSchemaKeys.has(key))
        .map(([key, nested]) => [key, clean(nested)]),
    );
  }

  return clean(schema) as Record<string, unknown>;
}

function itineraryJsonSchema() {
  return toOpenAIStructuredSchema(
    z.toJSONSchema(tripItinerarySchema, { target: "draft-7" }) as Record<
      string,
      unknown
    >,
  );
}

function systemPrompt() {
  return [
    "You are a careful travel-planning engine.",
    "You build realistic day-by-day itineraries as JSON only.",
    "Respect budget, pace, dates, interests, constraints, accessibility needs, and group type.",
    "Respect travel_radius_minutes and rental_car. If rental_car is no, prefer walking, public transit, rideshare, and geographically tight plans. If yes, include parking/driving notes where useful.",
    "Use provided candidate Google Places whenever possible.",
    "Hotels and restaurants must use specific named places. Do not write generic labels like 'central hotel', 'local bistro', 'restaurant in Montmartre', or 'near your accommodation' as the place name.",
    "If you cannot verify a hotel or restaurant from candidate Google Places, still provide a specific AI suggestion and mark source as ai_estimate with low or medium confidence.",
    "Do not invent exact opening hours, exact prices, or booking availability.",
    "If a detail is estimated, mark it as estimated or low confidence.",
    "Avoid unsafe, illegal, or age-inappropriate suggestions.",
    "Group activities geographically, include food breaks, transit notes, and backup suggestions.",
    "Include one practical hotel or accommodation recommendation for the trip, but do not claim live room availability, booking availability, or exact nightly prices.",
    "Include estimated flight cost in budget_breakdown.transit. If no starting city is provided, include a clearly labeled planning allowance only.",
    "Every itinerary item must have practical start_time and end_time values in HH:mm format.",
    "Every place should include latitude and longitude when candidate place data provides them.",
    "The budget_breakdown must include numeric food, accommodation, activities, transit, and miscellaneous category estimates. Transit must include local transit plus the flight planning allowance.",
  ].join(" ");
}

export async function generateItineraryWithOpenAI(args: {
  input: TripInput;
  candidatePlaces: NormalizedPlace[];
  weather: DailyWeather[];
}) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: getOpenAIModel(),
    input: [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          task: "Create a TripGlass itinerary. Return JSON matching the schema exactly.",
          user_input: args.input,
          candidate_google_places: args.candidatePlaces,
          weather_forecast: args.weather,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "trip_itinerary",
        schema: itineraryJsonSchema(),
        strict: true,
      },
    },
  });

  return tripItinerarySchema.parse(JSON.parse(response.output_text)) as TripItinerary;
}

export async function reviseItineraryWithOpenAI(args: {
  instruction: string;
  itinerary: TripItinerary;
}) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: getOpenAIModel(),
    input: [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          task: "Revise only the relevant parts of this itinerary. Preserve the JSON schema exactly.",
          instruction: args.instruction,
          current_itinerary: args.itinerary,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "trip_itinerary_revision",
        schema: itineraryJsonSchema(),
        strict: true,
      },
    },
  });

  return tripItinerarySchema.parse(JSON.parse(response.output_text)) as TripItinerary;
}
