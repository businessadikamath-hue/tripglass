import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCandidatePlaces } from "@/lib/server/googlePlaces";
import { buildMockItinerary } from "@/lib/server/mockTrip";
import {
  generateItineraryWithOpenAI,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/server/openai";
import { getDailyWeather } from "@/lib/server/weather";
import type { TripInput, TripItinerary } from "@/types/trip";

export function isMockModeEnabled() {
  return process.env.ENABLE_MOCK_MODE === "true";
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
  const weather = await getDailyWeather(
    input.destination_lat,
    input.destination_lng,
    input.start_date,
    input.end_date,
  ).catch(() => []);

  const candidatePlaces = await getCandidatePlaces({
    destination: input.destination_text,
    lat: input.destination_lat,
    lng: input.destination_lng,
    interests: input.interests,
    foodPreferences: input.food_preferences,
  }).catch(() => []);

  let itinerary: TripItinerary;
  let mockMode = false;

  if (!isOpenAIConfigured()) {
    if (!isMockModeEnabled()) {
      throw new Error("OPENAI_KEY_MISSING");
    }
    itinerary = buildMockItinerary(input);
    mockMode = true;
  } else {
    try {
      itinerary = await generateItineraryWithOpenAI({ input, candidatePlaces, weather });
    } catch (error) {
      if (!isMockModeEnabled()) throw error;
      console.error(
        "OpenAI generation failed; using mock fallback.",
        error instanceof Error ? error.message : "Unknown error",
      );
      itinerary = buildMockItinerary(input);
      itinerary.warnings.unshift("Live AI generation failed; mock fallback was used.");
      mockMode = true;
    }
  }

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
        destination_lat: input.destination_lat ?? null,
        destination_lng: input.destination_lng ?? null,
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
        ai_model: mockMode ? "mock" : getOpenAIModel(),
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
    mockMode,
    integrations: {
      openai: isOpenAIConfigured(),
      googlePlaces: Boolean(process.env.GOOGLE_MAPS_API_KEY),
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      weather: true,
    },
  };
}
