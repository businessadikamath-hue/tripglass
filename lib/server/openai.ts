import OpenAI from "openai";
import { z } from "zod";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";
import type { NormalizedPlace } from "@/types/places";
import type { TripInput, TripItinerary } from "@/types/trip";
import type { DailyWeather } from "@/types/weather";

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function itineraryJsonSchema() {
  return z.toJSONSchema(tripItinerarySchema, { target: "draft-7" }) as Record<string, unknown>;
}

function systemPrompt() {
  return [
    "You are a careful travel-planning engine.",
    "You build realistic day-by-day itineraries as JSON only.",
    "Respect budget, pace, dates, interests, constraints, accessibility needs, and group type.",
    "Use provided candidate Google Places whenever possible.",
    "Do not invent exact opening hours, exact prices, or booking availability.",
    "If a detail is estimated, mark it as estimated or low confidence.",
    "Avoid unsafe, illegal, or age-inappropriate suggestions.",
    "Group activities geographically, include food breaks, transit notes, and backup suggestions.",
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
