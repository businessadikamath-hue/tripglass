import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { reviseItineraryWithGemini } from "@/lib/server/gemini";
import { reviseItineraryWithOpenAI } from "@/lib/server/openai";
import { enrichItineraryPlaces } from "@/lib/server/placeEnrichment";
import {
  getAIProvider,
  getConfiguredAIModel,
  isConfiguredAIProviderAvailable,
} from "@/lib/server/tripGeneration";
import { createClient } from "@/lib/supabase/server";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";
import { revisionInputSchema } from "@/lib/validation/tripInput";
import type { TripRecord } from "@/types/trip";

function averageItineraryCoordinate(itinerary: { days: Array<{ items: Array<{ place: { lat: number | null; lng: number | null } }> }> }) {
  const coords = itinerary.days.flatMap((day) =>
    day.items
      .map((item) => item.place)
      .filter((place) => typeof place.lat === "number" && typeof place.lng === "number"),
  );
  if (coords.length === 0) return { lat: null, lng: null };

  return {
    lat: coords.reduce((sum, place) => sum + (place.lat ?? 0), 0) / coords.length,
    lng: coords.reduce((sum, place) => sum + (place.lng ?? 0), 0) / coords.length,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = revisionInputSchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Enter a short revision request.", 422, parsed.error.flatten());
  }

  const currentParsed = tripItinerarySchema.safeParse(parsed.data.current_itinerary_json);
  if (tripId.startsWith("guest-")) {
    if (!currentParsed.success) {
      return apiError("VALIDATION_ERROR", "The guest itinerary could not be revised.", 422);
    }
    if (!isConfiguredAIProviderAvailable()) {
      return apiError("MISSING_API_KEY", "The selected AI provider is not configured.", 500);
    }
    const revised =
      getAIProvider() === "gemini"
        ? await reviseItineraryWithGemini({
            instruction: parsed.data.instruction,
            itinerary: currentParsed.data,
          })
        : await reviseItineraryWithOpenAI({
            instruction: parsed.data.instruction,
            itinerary: currentParsed.data,
          });
    const center = averageItineraryCoordinate(currentParsed.data);
    const itinerary = await enrichItineraryPlaces(
      revised,
      { destination_text: revised.destination },
      center.lat,
      center.lng,
    );
    return NextResponse.json({ itinerary });
  }

  const supabase = await createClient();
  if (!supabase) return apiError("UNAUTHORIZED", "Supabase is not configured.", 401);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("UNAUTHORIZED", "Sign in to revise saved trips.", 401);

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();
  if (error || !trip) return apiError("NOT_FOUND", "Trip not found.", 404);

  const record = trip as TripRecord;
  let revised;
  if (!isConfiguredAIProviderAvailable()) {
    return apiError("MISSING_API_KEY", "The selected AI provider is not configured.", 500);
  } else {
    revised =
      getAIProvider() === "gemini"
        ? await reviseItineraryWithGemini({
            instruction: parsed.data.instruction,
            itinerary: record.itinerary_json,
          })
        : await reviseItineraryWithOpenAI({
            instruction: parsed.data.instruction,
            itinerary: record.itinerary_json,
          });
  }

  revised = await enrichItineraryPlaces(
    revised,
    { destination_text: record.destination_text },
    record.destination_lat,
    record.destination_lng,
  );

  await supabase.from("trip_revisions").insert({
    trip_id: tripId,
    user_id: user.id,
    instruction: parsed.data.instruction,
    previous_itinerary_json: record.itinerary_json,
    revised_itinerary_json: revised,
  });

  const { error: updateError } = await supabase
    .from("trips")
    .update({
      itinerary_json: revised,
      title: revised.title,
      estimated_total_cost: revised.estimated_total_cost,
      ai_model: getConfiguredAIModel(),
    })
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (updateError) return apiError("DATABASE_ERROR", "Could not save the revised itinerary.", 500);
  return NextResponse.json({ itinerary: revised });
}
