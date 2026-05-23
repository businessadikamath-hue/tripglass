import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { searchDestinationsFallback } from "@/lib/server/geocoding";
import {
  generateItineraryWithGemini,
  getGeminiModel,
  isGeminiConfigured,
} from "@/lib/server/gemini";
import { getCandidatePlaces } from "@/lib/server/googlePlaces";
import { enrichItineraryPlaces } from "@/lib/server/placeEnrichment";
import {
  generateItineraryWithOpenAI,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/server/openai";
import { getDailyWeather } from "@/lib/server/weather";
import type { TripInput, TripItinerary } from "@/types/trip";

export function getAIProvider() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (provider === "gemini" || provider === "openai") return provider;
  if (isGeminiConfigured()) return "gemini";
  return "openai";
}

export function isConfiguredAIProviderAvailable() {
  return getAIProvider() === "gemini" ? isGeminiConfigured() : isOpenAIConfigured();
}

export function getConfiguredAIModel() {
  return getAIProvider() === "gemini" ? getGeminiModel() : getOpenAIModel();
}

export function createShareSlug(destination: string) {
  const base = destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 36);
  return `${base || "trip"}-${randomUUID().slice(0, 8)}`;
}

export async function generateTrip(input: TripInput) {
  let destinationLat = input.destination_lat;
  let destinationLng = input.destination_lng;

  if (destinationLat === null || destinationLat === undefined || destinationLng === null || destinationLng === undefined) {
    const fallbackDestination = await searchDestinationsFallback(input.destination_text).catch(
      () => [],
    );
    destinationLat = fallbackDestination[0]?.lat ?? null;
    destinationLng = fallbackDestination[0]?.lng ?? null;
  }

  const weather = await getDailyWeather(
    destinationLat,
    destinationLng,
    input.start_date,
    input.end_date,
    input.days_count,
  ).catch(() => []);

  const candidatePlaces = await getCandidatePlaces({
    destination: input.destination_text,
    lat: destinationLat,
    lng: destinationLng,
    interests: input.interests,
    foodPreferences: input.food_preferences,
  }).catch(() => []);

  let itinerary: TripItinerary;

  if (!isConfiguredAIProviderAvailable()) {
    throw new Error(`${getAIProvider().toUpperCase()}_KEY_MISSING`);
  } else {
    itinerary =
      getAIProvider() === "gemini"
        ? await generateItineraryWithGemini({ input, candidatePlaces, weather })
        : await generateItineraryWithOpenAI({ input, candidatePlaces, weather });
  }

  itinerary = await enrichItineraryPlaces(
    applyWeatherForecast(itinerary, weather),
    input,
    destinationLat,
    destinationLng,
  );

  const supabase = await createClient();
  let tripId: string | null = null;
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (supabase && user) {
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        title: itinerary.title,
        destination_text: input.destination_text,
        destination_place_id: input.destination_place_id ?? null,
        destination_lat: destinationLat ?? null,
        destination_lng: destinationLng ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        days_count: input.days_count,
        budget_amount: input.budget_amount ?? null,
        currency: input.currency,
        travelers: input.travelers,
        travel_style: input.travel_style,
        pace: input.pace,
        interests: input.interests,
        food_preferences: input.food_preferences,
        accessibility_needs: input.accessibility_needs,
        must_see: input.must_see,
        avoid: input.avoid,
        status: "generated",
        input_snapshot: input,
        itinerary_json: itinerary,
        ai_model: getConfiguredAIModel(),
        estimated_total_cost: itinerary.estimated_total_cost,
      })
      .select("id")
      .single();

    if (error) throw error;
    tripId = data.id;
  }

  return {
    itinerary,
    tripId,
    guestTripId: tripId ? null : `guest-${randomUUID().slice(0, 12)}`,
    integrations: {
      openai: isOpenAIConfigured(),
      gemini: isGeminiConfigured(),
      aiProvider: getAIProvider(),
      googlePlaces: Boolean(process.env.GOOGLE_MAPS_API_KEY),
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      weather: true,
    },
  };
}

function packingTipFor(condition: string | null, high: number | null, low: number | null) {
  const lower = condition?.toLowerCase() ?? "";
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("thunder")) {
    return "Pack a compact umbrella or rain shell and choose shoes that handle wet streets.";
  }
  if (high !== null && high >= 28) {
    return "Bring a refillable water bottle, sunscreen, and breathable layers.";
  }
  if (low !== null && low <= 8) {
    return "Bring a warm layer, especially for early starts and evening plans.";
  }
  return "Bring comfortable walking shoes and one light layer for changing conditions.";
}

function applyWeatherForecast(itinerary: TripItinerary, weather: Awaited<ReturnType<typeof getDailyWeather>>) {
  if (weather.length === 0) return itinerary;

  return {
    ...itinerary,
    days: itinerary.days.map((day, index) => {
      const forecast = weather[index] ?? weather[weather.length - 1];
      if (!forecast) return day;

      return {
        ...day,
        date: day.date ?? forecast.date,
        weather: {
          available: forecast.available,
          condition: forecast.condition,
          high_temp_c: forecast.high_temp_c,
          low_temp_c: forecast.low_temp_c,
          packing_tip: packingTipFor(
            forecast.condition,
            forecast.high_temp_c,
            forecast.low_temp_c,
          ),
        },
      };
    }),
  };
}
