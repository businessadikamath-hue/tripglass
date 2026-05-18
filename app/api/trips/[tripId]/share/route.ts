import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { createShareSlug } from "@/lib/server/tripGeneration";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  if (process.env.ENABLE_PUBLIC_SHARING === "false") {
    return apiError("UNKNOWN_ERROR", "Public sharing is disabled for this deployment.", 403);
  }

  const { tripId } = await params;
  const supabase = await createClient();
  if (!supabase) return apiError("UNAUTHORIZED", "Supabase is not configured.", 401);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("UNAUTHORIZED", "Sign in to share saved trips.", 401);

  const { data: trip } = await supabase
    .from("trips")
    .select("destination_text, public_share_slug")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!trip) return apiError("NOT_FOUND", "Trip not found.", 404);
  const slug = trip.public_share_slug ?? createShareSlug(trip.destination_text);

  const { error } = await supabase
    .from("trips")
    .update({ is_public: true, public_share_slug: slug })
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) return apiError("DATABASE_ERROR", "Could not enable public sharing.", 500);
  return NextResponse.json({ slug });
}
