import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {};
    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(loginUrl);
    }

    const user = data?.user;
    if (supabase && user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null,
        default_currency: "USD",
      });
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
