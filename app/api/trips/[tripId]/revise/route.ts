import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { buildMockItinerary } from "@/lib/server/mockTrip";
import { reviseItineraryWithOpenAI, isOpenAIConfigured, getOpenAIModel } from "@/lib/server/openai";
import { createClient } from "@/lib/supabase/server";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";
import { revisionInputSchema } from "@/lib/validation/tripInput";
import type { TripRecord } from "@/types/trip";

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
    if (!isOpenAIConfigured()) {
      const revised = {
        ...currentParsed.data,
        warnings: [
          `Mock revision note: "${parsed.data.instruction}" was recorded, but live AI revision needs OPENAI_API_KEY.`,
          ...currentParsed.data.warnings,
        ],
      };
      return NextResponse.json({ itinerary: revised, mockMode: true });
    }
    const itinerary = await reviseItineraryWithOpenAI({
      instruction: parsed.data.instruction,
      itinerary: currentParsed.data,
    });
    return NextResponse.json({ itinerary, mockMode: false });
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
  if (!isOpenAIConfigured()) {
    revised = buildMockItinerary(record.input_snapshot);
    revised.warnings.unshift(`Mock revision mode: "${parsed.data.instruction}"`);
  } else {
    revised = await reviseItineraryWithOpenAI({
      instruction: parsed.data.instruction,
      itinerary: record.itinerary_json,
    });
  }

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
      ai_model: isOpenAIConfigured() ? getOpenAIModel() : "mock",
    })
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (updateError) return apiError("DATABASE_ERROR", "Could not save the revised itinerary.", 500);
  return NextResponse.json({ itinerary: revised, mockMode: !isOpenAIConfigured() });
}
