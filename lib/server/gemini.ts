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
    "Every itinerary item must have a practical start_time and end_time in HH:mm format so a traveler can follow the plan minute by minute.",
    "Every itinerary item must include an estimated_cost.amount number or 0 if free.",
    "Every place should include latitude and longitude when a candidate place provides them.",
    "The budget_breakdown food, accommodation, activities, transit, and miscellaneous fields must be numbers, not null, and must roughly add up to estimated_total_cost. Transit must include local transit plus the flight planning allowance.",
    "Return valid JSON only. Do not include markdown.",
    "The JSON must match the TripGlass itinerary shape: title, destination, summary, days_count, currency, estimated_total_cost, budget_status, best_for, neighborhoods, travel_tips, warnings, budget_breakdown, and days. Each day must include weather, items, and backup_options. Each item must include place, estimated_cost, why_it_fits, transit_note, accessibility_note, and booking_note.",
  ].join(" ");
}

async function generateStructuredItinerary(prompt: string) {
  const firstText = await requestGeminiJson(prompt);

  try {
    return tripItinerarySchema.parse(normalizeItineraryCandidate(JSON.parse(firstText))) as TripItinerary;
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

    return tripItinerarySchema.parse(
      normalizeItineraryCandidate(JSON.parse(repairedText)),
    ) as TripItinerary;
  }
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

function normalizeBudgetStatus(value: unknown) {
  const normalized = String(value ?? "unknown")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    normalized === "under_budget" ||
    normalized === "near_budget" ||
    normalized === "over_budget" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeCategory(value: unknown) {
  const normalized = String(value ?? "other").toLowerCase().replace(/[\s-]+/g, "_");
  const categories = new Set([
    "attraction",
    "restaurant",
    "cafe",
    "museum",
    "nature",
    "shopping",
    "neighborhood",
    "transport",
    "break",
    "hotel",
    "nightlife",
    "other",
  ]);
  return categories.has(normalized) ? normalized : "other";
}

function normalizePlaceSource(value: unknown) {
  const normalized = String(value ?? "ai_estimate").toLowerCase();
  return normalized === "google_places" ||
    normalized === "ai_estimate" ||
    normalized === "user_input"
    ? normalized
    : "ai_estimate";
}

function normalizeConfidence(value: unknown) {
  const normalized = String(value ?? "medium").toLowerCase();
  return normalized === "low" || normalized === "medium" || normalized === "high"
    ? normalized
    : "medium";
}

function normalizeItineraryCandidate(candidate: unknown) {
  const itinerary = (candidate && typeof candidate === "object" ? candidate : {}) as Record<
    string,
    unknown
  >;
  const budgetBreakdown =
    itinerary.budget_breakdown && typeof itinerary.budget_breakdown === "object"
      ? (itinerary.budget_breakdown as Record<string, unknown>)
      : {};

  const days = Array.isArray(itinerary.days) ? itinerary.days : [];
  const normalizedDays = days.map((rawDay, dayIndex) => {
    const day = (rawDay && typeof rawDay === "object" ? rawDay : {}) as Record<
      string,
      unknown
    >;
    const weather =
      day.weather && typeof day.weather === "object"
        ? (day.weather as Record<string, unknown>)
        : {};
    const items = Array.isArray(day.items) ? day.items : [];

    return {
      day_number: Number(day.day_number ?? dayIndex + 1),
      date: day.date === undefined ? null : (day.date as string | null),
      title: String(day.title ?? `Day ${dayIndex + 1}`),
      summary: String(day.summary ?? "A balanced day of travel planning."),
      weather: {
        available: Boolean(weather.available),
        condition: weather.condition === undefined ? null : (weather.condition as string | null),
        high_temp_c: toNumberOrNull(weather.high_temp_c),
        low_temp_c: toNumberOrNull(weather.low_temp_c),
        packing_tip:
          weather.packing_tip === undefined ? null : (weather.packing_tip as string | null),
      },
      items: items.map((rawItem, itemIndex) => {
        const item =
          rawItem && typeof rawItem === "object"
            ? (rawItem as Record<string, unknown>)
            : {};
        const place =
          item.place && typeof item.place === "object"
            ? (item.place as Record<string, unknown>)
            : {};
        const estimatedCost =
          item.estimated_cost && typeof item.estimated_cost === "object"
            ? (item.estimated_cost as Record<string, unknown>)
            : {};

        return {
          start_time: String(item.start_time ?? "09:00"),
          end_time: String(item.end_time ?? "10:30"),
          title: String(item.title ?? `Stop ${itemIndex + 1}`),
          description: String(item.description ?? "Suggested itinerary stop."),
          category: normalizeCategory(item.category),
          place: {
            name: place.name === undefined ? null : (place.name as string | null),
            google_place_id:
              place.google_place_id === undefined
                ? null
                : (place.google_place_id as string | null),
            address: place.address === undefined ? null : (place.address as string | null),
            lat: toNumberOrNull(place.lat),
            lng: toNumberOrNull(place.lng),
            google_maps_url:
              place.google_maps_url === undefined
                ? null
                : (place.google_maps_url as string | null),
            source: normalizePlaceSource(place.source),
          },
          estimated_cost: {
            amount: toNumberOrNull(estimatedCost.amount) ?? 0,
            currency: String(estimatedCost.currency ?? itinerary.currency ?? "USD")
              .slice(0, 3)
              .toUpperCase(),
            confidence: normalizeConfidence(estimatedCost.confidence),
            note: String(estimatedCost.note ?? "Estimate only."),
          },
          why_it_fits: String(item.why_it_fits ?? "Matches the requested trip style."),
          transit_note:
            item.transit_note === undefined ? null : (item.transit_note as string | null),
          accessibility_note:
            item.accessibility_note === undefined
              ? null
              : (item.accessibility_note as string | null),
          booking_note:
            item.booking_note === undefined ? null : (item.booking_note as string | null),
        };
      }),
      backup_options: (Array.isArray(day.backup_options) ? day.backup_options : []).map(
        (rawBackup) => {
          const backup =
            rawBackup && typeof rawBackup === "object"
              ? (rawBackup as Record<string, unknown>)
              : {};
          return {
            title: String(backup.title ?? "Backup option"),
            description: String(backup.description ?? "Alternative activity."),
            best_if: String(backup.best_if ?? "Plans change."),
            estimated_cost: toNumberOrNull(backup.estimated_cost),
          };
        },
      ),
    };
  });

  const derivedBreakdown = deriveBudgetBreakdown(normalizedDays);
  const estimatedTotal =
    toNumberOrNull(itinerary.estimated_total_cost) ??
    derivedBreakdown.food +
      derivedBreakdown.accommodation +
      derivedBreakdown.activities +
      derivedBreakdown.transit +
      derivedBreakdown.miscellaneous;

  return {
    title: String(itinerary.title ?? "Generated trip"),
    destination: String(itinerary.destination ?? "Destination"),
    summary: String(itinerary.summary ?? "Generated itinerary."),
    days_count: Number(itinerary.days_count ?? days.length ?? 1),
    currency: String(itinerary.currency ?? "USD").slice(0, 3).toUpperCase(),
    estimated_total_cost: estimatedTotal,
    budget_status: normalizeBudgetStatus(itinerary.budget_status),
    best_for: toStringArray(itinerary.best_for),
    neighborhoods: toStringArray(itinerary.neighborhoods),
    travel_tips: toStringArray(itinerary.travel_tips),
    warnings: toStringArray(itinerary.warnings),
    budget_breakdown: {
      food: toNumberOrNull(budgetBreakdown.food) ?? derivedBreakdown.food,
      accommodation:
        toNumberOrNull(budgetBreakdown.accommodation) ?? derivedBreakdown.accommodation,
      activities: toNumberOrNull(budgetBreakdown.activities) ?? derivedBreakdown.activities,
      transit: toNumberOrNull(budgetBreakdown.transit) ?? derivedBreakdown.transit,
      miscellaneous:
        toNumberOrNull(budgetBreakdown.miscellaneous) ?? derivedBreakdown.miscellaneous,
      notes: String(budgetBreakdown.notes ?? "Costs are estimates."),
    },
    days: normalizedDays,
  };
}

function deriveBudgetBreakdown(days: Array<{ items: Array<{ category: string; estimated_cost: { amount: number | null } }> }>) {
  const totals = {
    food: 0,
    accommodation: 0,
    activities: 0,
    transit: 0,
    miscellaneous: 0,
  };

  for (const day of days) {
    for (const item of day.items) {
      const amount = item.estimated_cost.amount ?? 0;
      if (item.category === "restaurant" || item.category === "cafe") {
        totals.food += amount;
      } else if (item.category === "transport") {
        totals.transit += amount;
      } else if (item.category === "hotel") {
        totals.accommodation += amount;
      } else if (item.category === "break" || item.category === "other") {
        totals.miscellaneous += amount;
      } else {
        totals.activities += amount;
      }
    }
  }

  return totals;
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
