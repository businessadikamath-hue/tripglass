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
import type { BudgetStatus, TripInput, TripItinerary } from "@/types/trip";

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
    travelRadiusMinutes: input.travel_radius_minutes,
    rentalCar: input.rental_car,
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

  itinerary = ensureBudgetPlanningEstimates(
    applyWeatherForecast(itinerary, weather),
    input,
  );

  itinerary = await enrichItineraryPlaces(
    itinerary,
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

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

function estimateAccommodation(input: TripInput) {
  const roomCount = Math.max(1, Math.ceil(input.travelers / 2));
  const nights = Math.max(1, input.days_count - 1);
  const baseline = roomCount * nights * 170;
  if (!input.budget_amount) return roundToTen(baseline);

  const budgetBased = input.budget_amount * 0.32;
  return roundToTen(Math.max(Math.min(budgetBased, input.budget_amount * 0.45), baseline * 0.55));
}

function estimateFlights(input: TripInput) {
  const perTraveler = input.starting_city?.trim() ? 360 : 280;
  const baseline = perTraveler * input.travelers;
  if (!input.budget_amount) return roundToTen(baseline);

  const budgetBased = input.budget_amount * 0.3;
  return roundToTen(Math.max(Math.min(budgetBased, input.budget_amount * 0.45), baseline * 0.6));
}

function getBudgetStatus(total: number, budget?: number | null): BudgetStatus {
  if (!budget) return "unknown";
  const ratio = total / budget;
  if (ratio <= 0.9) return "under_budget";
  if (ratio <= 1.1) return "near_budget";
  return "over_budget";
}

function ensureBudgetPlanningEstimates(itinerary: TripItinerary, input: TripInput) {
  const breakdown = itinerary.budget_breakdown;
  const accommodation = breakdown.accommodation && breakdown.accommodation > 0
    ? breakdown.accommodation
    : estimateAccommodation(input);
  const localTransit = breakdown.transit ?? 0;
  const flightEstimate = estimateFlights(input);
  const transit = localTransit >= flightEstimate ? localTransit : localTransit + flightEstimate;
  const food = breakdown.food ?? 0;
  const activities = breakdown.activities ?? 0;
  const miscellaneous = breakdown.miscellaneous ?? 0;
  const estimatedTotal = food + accommodation + activities + transit + miscellaneous;
  const noteParts = [
    breakdown.notes,
    `Hotel is a planning estimate, not live room pricing.`,
    `Transit includes an estimated flight allowance of ${input.currency} ${flightEstimate}; verify live fares before booking.`,
  ].filter(Boolean);

  return {
    ...itinerary,
    estimated_total_cost: estimatedTotal,
    budget_status: getBudgetStatus(estimatedTotal, input.budget_amount),
    warnings: Array.from(
      new Set([
        ...itinerary.warnings,
        "Hotel and flight costs are planning estimates, not live prices or availability.",
      ]),
    ),
    budget_breakdown: {
      ...breakdown,
      food,
      accommodation,
      activities,
      transit,
      miscellaneous,
      notes: noteParts.join(" "),
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
