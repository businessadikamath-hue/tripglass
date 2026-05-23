import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const supabase = await createClient();
  if (!supabase) return apiError("UNAUTHORIZED", "Supabase is not configured.", 401);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("UNAUTHORIZED", "Sign in to delete saved trips.", 401);

  const { error, count } = await supabase
    .from("trips")
    .delete({ count: "exact" })
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) return apiError("DATABASE_ERROR", "Could not delete this trip.", 500);
  if (count === 0) return apiError("NOT_FOUND", "Trip not found.", 404);

  return NextResponse.json({ ok: true });
}
