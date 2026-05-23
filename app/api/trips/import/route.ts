import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { createClient } from "@/lib/supabase/server";
import { tripItinerarySchema } from "@/lib/validation/itinerarySchema";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const itinerary = tripItinerarySchema.safeParse(payload?.itinerary_json);

  if (!itinerary.success) {
    return apiError("VALIDATION_ERROR", "This local trip could not be imported.", 422);
  }

  const supabase = await createClient();
  if (!supabase) return apiError("UNAUTHORIZED", "Supabase is not configured.", 401);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("UNAUTHORIZED", "Sign in to import local trips.", 401);

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title: itinerary.data.title,
      destination_text: itinerary.data.destination,
      days_count: itinerary.data.days_count,
      currency: itinerary.data.currency,
      status: "generated",
      input_snapshot: payload?.input_snapshot ?? {},
      itinerary_json: itinerary.data,
      estimated_total_cost: itinerary.data.estimated_total_cost,
      ai_model: "imported",
    })
    .select("id")
    .single();

  if (error) {
    return apiError("DATABASE_ERROR", "Could not import this local trip.", 500);
  }

  return NextResponse.json({ tripId: data.id });
}
