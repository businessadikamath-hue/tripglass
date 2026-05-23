import { z } from "zod";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";
import type { NormalizedPlace } from "@/types/places";
import type { TripInput, TripItinerary } from "@/types/trip";
import type { DailyWeather } from "@/types/weather";

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
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
    "Return valid JSON only. Do not include markdown.",
    "The JSON must match the TripGlass itinerary shape: title, destination, summary, days_count, currency, estimated_total_cost, budget_status, best_for, neighborhoods, travel_tips, warnings, budget_breakdown, and days. Each day must include weather, items, and backup_options. Each item must include place, estimated_cost, why_it_fits, transit_note, accessibility_note, and booking_note.",
  ].join(" ");
}

async function generateStructuredItinerary(prompt: string) {
  const firstText = await requestGeminiJson(prompt);

  try {
    return tripItinerarySchema.parse(JSON.parse(firstText)) as TripItinerary;
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;

    const repairedText = await requestGeminiJson(
      JSON.stringify({
        task: "Repair this JSON so it exactly matches the TripGlass itinerary schema. Return only the repaired JSON.",
        validation_errors: error.issues,
        invalid_json: firstText,
        hard_requirements: [
          "budget_status must be one of: under_budget, near_budget, over_budget, unknown.",
          "All cost fields must be numbers or null, never strings.",
          "All nullable fields must be present with either a value or null.",
          "Each itinerary item category must be one of the allowed category enum values.",
          "Each place.source must be google_places, ai_estimate, or user_input.",
        ],
      }),
    );

    return tripItinerarySchema.parse(JSON.parse(repairedText)) as TripItinerary;
  }
}

async function requestGeminiJson(prompt: string) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_KEY_MISSING");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      getGeminiModel(),
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt() }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as GeminiGenerateResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Gemini request failed with ${response.status}`,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");

  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export async function generateItineraryWithGemini(args: {
  input: TripInput;
  candidatePlaces: NormalizedPlace[];
  weather: DailyWeather[];
}) {
  return generateStructuredItinerary(
    JSON.stringify({
      task: "Create a TripGlass itinerary. Return JSON matching the schema exactly.",
      user_input: args.input,
      candidate_google_places: args.candidatePlaces,
      weather_forecast: args.weather,
    }),
  );
}

export async function reviseItineraryWithGemini(args: {
  instruction: string;
  itinerary: TripItinerary;
}) {
  return generateStructuredItinerary(
    JSON.stringify({
      task: "Revise only the relevant parts of this itinerary. Preserve the JSON schema exactly.",
      instruction: args.instruction,
      current_itinerary: args.itinerary,
    }),
  );
}
