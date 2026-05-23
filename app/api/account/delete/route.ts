import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  if (!supabase) {
    return apiError("UNAUTHORIZED", "Supabase is not configured.", 401);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return apiError("UNAUTHORIZED", "Sign in before deleting your account.", 401);
  }

  const admin = createAdminClient();
  if (!admin) {
    return apiError(
      "MISSING_API_KEY",
      "Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the server.",
      500,
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return apiError("DATABASE_ERROR", "Could not delete this account. Try again in a moment.", 500);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");
  return response;
}
